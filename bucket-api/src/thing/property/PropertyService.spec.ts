import { expect } from 'chai';

import { PropertyService } from "./PropertyService";
import { ThingService } from "../ThingService";
import { Thing } from "../Thing";
import { Log } from '../../Logger';
import { Bucket } from "../../Bucket"
import { v4 as uuidv4 } from "uuid";
import { InfluxDbService } from '../../influx/InfluxDbService';

function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const DELAY_MS = 1000;

describe("PropertyService", () => {

    let bucket = new Bucket()

    before(async function () {
        Log.init("Test");
        const sqlPromise = bucket.connectSQLDb().catch((error: Error) => {
            // Could not connect wait and try again
            Log.debug(JSON.stringify(error));
            Log.info("Retrying to connect in " + DELAY_MS + " ms.");
            delay(DELAY_MS).then(() => {
                return bucket.connectSQLDb();
            });
        });
        const influxPromise = bucket.connectInfluxDb().catch((error) => {
            Log.error(JSON.stringify(error));
            Log.info("Retrying to connect to InfluxDB in " + DELAY_MS + " ms.");
            delay(DELAY_MS).then(() => {
                return bucket.connectInfluxDb();
            });
        });
        // When both Database connections are established
        return Promise.all([sqlPromise, influxPromise]);
    });

    after(function () {
        return bucket.disconnectSQLDb();
    });

    it("Create property", async function () {

        // test save thing

        const thingService = ThingService.getInstance();
        const newThing = new Thing();
        newThing.id = thingService.generateThingID();
        newThing.name = 'test thing'
        newThing.type = 'TEST'
        newThing.personId = 'dcd:persons:' + uuidv4();
        const createdThing = await thingService.saveNewThing(newThing)
        const dtoProperty = {
            name: 'test property',
            typeId: 'ACCELEROMETER'
        }

        // test save property

        const propertyService = PropertyService.getInstance();
        const createdProperty = await propertyService.createNewProperty(createdThing, dtoProperty);
        expect(createdProperty).to.be.a("Object", "The result is not a property.");
        expect(createdProperty.name).to.equal('test property');
        expect(createdProperty.type.id).to.equal('ACCELEROMETER');
        expect(createdProperty.type.dimensions.length).to.equal(3);
        expect(createdProperty.thing.id).to.equal(createdThing.id);
        expect(createdProperty.thing.personId).to.equal(createdThing.personId);

        // test add and read data

        createdProperty.values = [[1, 2, 3, 4], [2, 6, 7, 8], [3, 1, 5, 9], [4, 4, 5, 0]]
        await propertyService.updatePropertyValues(createdProperty)
        const valueOptions = {
            from: 1,
            to: 4,
            timeInterval: undefined,
            fctInterval: undefined,
            fill: undefined
        }

        const propertyWithRetrievedValues = await propertyService.getOnePropertyById(createdThing.id, createdProperty.id, valueOptions)
        expect(propertyWithRetrievedValues.values.length).to.equal(4, "Number of values should be 4.")

        // test delete two data points

        await propertyService.deleteDataPoints(createdThing.id, createdProperty.id, [2,4])

        const propertyWithValuesAfterDelete = await propertyService.getOnePropertyById(createdThing.id, createdProperty.id, valueOptions)
        expect(propertyWithValuesAfterDelete.values.length).to.equal(2, "Number of values should be 2.")

        // test delete property

        await propertyService.deleteOneProperty(createdThing.id, createdProperty.id)

        try {
            const propertyAferDeletion = await propertyService.getOnePropertyById(createdThing.id, createdProperty.id)
            expect(propertyAferDeletion).to.be(undefined, "Property after deletion should be undefined.")
        } catch (error) {
            // this error must be triggered because 
            expect(error._hint).to.equal("Property not found.");
        }

        // test get data from influx, should not be there (deleted with property)

        const influxDBService = InfluxDbService.getInstance();
        const values = await influxDBService.readValuesFromInfluxDB(createdProperty, valueOptions);
        expect(values.length).to.equal(0, "There should be no values after deletion.")

        return Promise.resolve();
    });

});
