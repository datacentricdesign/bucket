
import { getRepository, DeleteResult, SelectQueryBuilder } from "typeorm";

import { Thing } from "../Thing";
import { Property } from "./Property";
import { PropertyType } from "./propertyType/PropertyType";

import { PropertyTypeService } from "./propertyType/PropertyTypeService"

import { DCDError } from "@datacentricdesign/types";

import { v4 as uuidv4 } from 'uuid';
import { envConfig } from "../../config/envConfig";
import { InfluxDB } from "influx";
import config from "../../config";
import { ValueOptions, DTOProperty } from "@datacentricdesign/types";
import { ThingService } from "../services/ThingService";
import { AuthController } from "../http/AuthController";
import { Log } from "../../Logger";
import ThingController from "../http/ThingController";
import { PolicyService } from "../services/PolicyService";

export class PropertyService {

    static propertyTypeService = new PropertyTypeService();
    private influx: InfluxDB
    private ready: boolean = false
    private cachedTypes = {}

    /**
     *
     * @constructor
     */
    constructor() {
        this.init(1000)
    }

    async init(delayMs: number) {
        // Connect to the time series database
        this.influx = new InfluxDB(config.influxdb)
        this.influx.getDatabaseNames()
            // Double check the timeseries db exists
            .then(async names => {
                Log.info("Connected to InfluxDb");
                if (names.indexOf(config.influxdb.database) > -1) {
                    await this.influx.createDatabase(config.influxdb.database);
                    this.ready = true;
                }
                this.ready = true
                return Promise.resolve()
            }).catch((error) => {
                Log.error(JSON.stringify(error));
                Log.info("Retrying to connect to InfluxDB in " + delayMs + " ms.");
                delay(delayMs).then(() => {
                    this.init(delayMs * 1.5);
                })
            });
    }

    /**
     * Create a new Property.
     **/
    async createNewProperty(thingId: string, dtoProperty: DTOProperty): Promise<Property> {
        // Check if property type id is provided
        if (dtoProperty.typeId === undefined || dtoProperty.typeId === '') {
            return Promise.reject(new DCDError(4003, 'Add field typeId.'))
        }
        const property: Property = new Property()
        // Retrieve the property type
        property.type = await PropertyService.propertyTypeService.getOnePropertyTypeById(dtoProperty.typeId)
        // Retrieve thing details from thingId
        property.thing = await ThingController.thingService.getOneThingById(thingId)
        // If no name was provided, then use the generic type's
        property.name = (dtoProperty.name === undefined || dtoProperty.name === '') ? property.type.name : dtoProperty.name
        // If no description was provided, then use the generic type's
        property.description = (dtoProperty.description === undefined || dtoProperty.description === '') ? property.type.description : dtoProperty.description
        // Generate a new id with the property prefix
        property.id = "dcd:properties:" + uuidv4()
        // Try to retrieve Property from the database
        const propertyRepository = getRepository(Property);
        await propertyRepository.save(property);
        return property;
    }

    /**
     * List the Properties of a Thing.
     * @param {string} thingId
     **/
    async getPropertiesOfAThing(thingId: string, valueOptions?: ValueOptions): Promise<Property[]> {
        // Get properties from the database
        const propertyRepository = getRepository(Property);
        let properties = await propertyRepository
            .createQueryBuilder("property")
            .innerJoinAndSelect("property.thing", "thing")
            .innerJoinAndSelect("property.type", "type")
            .innerJoinAndSelect("type.dimensions", "dimensions")
            .where("thing.id = :thingId")
            .setParameters({ thingId: thingId })
            .getMany();
        return properties
    }

    /**
     * List all accessible Properties.
     * @param {string} subjectId person, thing or group id ()
     * @param {string} audienceId person, thing or group id
     **/
    async getProperties(actor: string, subject: string, audienceId: string, from: string, timeInterval: string): Promise<Property[]> {
        let groups = []
        if (audienceId === '*') {
            groups = await AuthController.policyService.listGroupMembership(subject)
        } else {
            try {
                await AuthController.policyService.checkGroupMembership(subject, audienceId)
                groups.push(audienceId)
            } catch (error) {
                return Promise.reject(error)
            }
        }

        // Get the list of all consent concerning the current subject
        let consents = []
        for (let i = 0; i < groups.length; i++) {
            const result = await AuthController.policyService.listConsents('subject', groups[i])
            if (result.errorCode === undefined) {
                consents = consents.concat(result)
            }
        }

        let resources = []
        let resourcesOrigin = {}
        for (let i = 0; i < consents.length; i++) {
            if (consents[i].effect === 'allow') {
                for (let j = 0; j < consents[i].resources.length; j++) {
                    let resource = consents[i].resources[j]
                    if (resourcesOrigin[resource] !== undefined) {
                        resourcesOrigin[resource] = resourcesOrigin[resource].concat(consents[i].subjects)
                    } else {
                        resourcesOrigin[resource] = consents[i].subjects
                    }
                }
                resources = resources.concat(consents[i].resources)
            }
        }

        // Get properties from the database
        const propertyRepository = getRepository(Property);
        let properties = await propertyRepository
            .createQueryBuilder("property")
            .innerJoinAndSelect("property.type", "type")
            .innerJoinAndSelect("property.thing", "thing")
            .innerJoinAndSelect("type.dimensions", "dimensions")
            .where("property.id = ANY (:values)")
            .setParameters({ values: resources })
            .getMany();

        for (let i = 0; i < properties.length; i++) {
            properties[i].sharedWith = resourcesOrigin[properties[i].id]
            if (from !== undefined && timeInterval !== undefined) {
                properties[i].values = await this.countDataPoints(properties[i].thing.id, properties[i].id, properties[i].type.id, from, timeInterval)
            }
        }

        return properties
    }

    /**
     * Read a Property.
     * @param {string} propertyId
     * returns {Property}
     **/
    async getOnePropertyById(thingId: string, propertyId: string, valueOptions?: ValueOptions) {
        // Get property from the database
        const propertyRepository = getRepository(Property);
        let property = await propertyRepository
            .createQueryBuilder("property")
            .innerJoinAndSelect("property.thing", "thing")
            .innerJoinAndSelect("property.type", "type")
            .innerJoinAndSelect("type.dimensions", "dimensions")
            .where("property.id = :propertyId AND thing.id = :thingId")
            .setParameters({ propertyId: propertyId, thingId: thingId })
            .getOne();

        if (property !== undefined && valueOptions != undefined) {
            Log.debug(valueOptions.from)
            return this.readValuesFromInfluxDB(property, valueOptions)
        }
        return property
    }

    /**
     * List the Properties of a Thing, of a given type
     * @param {string} thingId
     **/
    async getPropertiesOfAThingByType(thingId: string, typeId: string, valueOptions?: ValueOptions): Promise<Property[]> {
        // Get properties from the database
        const propertyRepository = getRepository(Property);
        let properties = await propertyRepository
            .createQueryBuilder("property")
            .innerJoinAndSelect("property.thing", "thing")
            .innerJoinAndSelect("property.type", "type")
            .innerJoinAndSelect("type.dimensions", "dimensions")
            .where("thing.id = :thingId AND type.id = :typeId")
            .setParameters({ thingId: thingId, typeId: typeId })
            .getMany();
        return properties
    }

    /**
     * List Properties by Type Id.
     * @param {string} propertyId
     * returns {Property[]}
     **/
    async getPropertiesByTypeId(thingId: string, typeId: string): Promise<Property[]> {
        // Get properties from the database
        const propertyRepository = getRepository(Property);
        let properties = await propertyRepository
            .createQueryBuilder("property")
            .innerJoinAndSelect("property.thing", "thing")
            .innerJoinAndSelect("property.type", "type")
            .innerJoinAndSelect("type.dimensions", "dimensions")
            .where("thing.id = :thingId AND type.id = :typeId")
            .setParameters({ thingId: thingId, typeId: typeId })
            .getMany();

        return properties
    }

    /**
     * Edit one Property
     * @param property
     * returns Promise
     **/
    editOneProperty(property: Property) {
        const propertyRepository = getRepository(Property);
        return propertyRepository.save(property);
    }

    /**
     * Update values of a Property
     * @param property
     * returns Promise
     **/
    async updatePropertyValues(property: Property) {
        if (property.type === undefined) {
            property.type = await this.getPropertyType(property.id)
        }
        console.log(property)
        return this.valuesToInfluxDB(property)
    }

    async getPropertyType(propertyId: string) {
        if (!this.cachedTypes.hasOwnProperty(propertyId)) {
            const propertyRepository = getRepository(Property)
            const property: Property = await propertyRepository
                .createQueryBuilder("property")
                .innerJoinAndSelect("property.type", "type")
                .innerJoinAndSelect("type.dimensions", "dimensions")
                .where("property.id = :propertyId")
                .setParameters({ propertyId: propertyId })
                .getOne()
            this.cachedTypes[propertyId] = property.type
        }
        return this.cachedTypes[propertyId]
    }

    /**
     * Delete one property
     * @param propertyId
     * @return {Promise}
     */
    async deleteOneProperty(thingId: string, propertyId: string): Promise<DeleteResult> {
        const propertyRepository = getRepository(Property);
        let property: Property = await this.getOnePropertyById(thingId, propertyId);
        if (property === undefined) {
            throw new DCDError(404, 'Property to delete ' + propertyId + ' could not be not found for Thing ' + thingId + '.')
        }
        return propertyRepository.delete(propertyId);
    }

    /**
     * @param {Property} property
     */
    private valuesToInfluxDB(property: Property) {
        const points = [];
        const dimensions = property.type.dimensions;
        for (let index in property.values) {
            let ts: any;
            const values: Array<string | number> = property.values[index]
            if (values.length - 1 === dimensions.length ||
                values.length === dimensions.length) {
                if (values.length === dimensions.length) {
                    // missing time, take from server
                    ts = Date.now();
                } else {
                    ts = (typeof values[0] === 'string') ? Number.parseInt(values[0] + "") : values[0];
                }

                const fields = {};
                for (let i = 1; i < values.length; i++) {
                    const name = dimensions[i - 1].name;
                    fields[name] = values[i];
                }

                const point = {
                    measurement: property.type.id,
                    tags: {
                        "propertyId": property.id,
                        "thingId": property.thing.id,
                        "personId": property.thing.personId
                    },
                    fields: fields,
                    timestamp: ts
                };

                points.push(point);
            }
        }
        return this.influx.writePoints(points, { precision: 'ms' })
    }

    /**
     * @param {Property} property
     * @param {number} from
     * @param {number} to
     * @param {string} timeInterval
     * @param {string} fctInterval
     * @param {string} fill
     * @return {Promise<Property>}
     */
    private readValuesFromInfluxDB(property: Property, opt: ValueOptions): Promise<Property> {
        Log.debug(opt)
        let query = `SELECT "time"`
        for (let index in property.type.dimensions) {
            if (opt.timeInterval !== undefined) {
                query += `, ${opt.fctInterval}("${property.type.dimensions[index].name}")`
            } else {
                query += `, "${property.type.dimensions[index].name}" `
            }
        }
        query += ` FROM "${property.type.id}"`

        if (opt.from !== undefined && opt.to !== undefined) {
            const start = new Date(opt.from).toISOString()
            const end = new Date(opt.to).toISOString()
            query += ` WHERE time >= '${start}' AND time <= '${end}' AND "thingId" = '${property.thing.id}' AND "propertyId" = '${property.id}'`
        }

        if (opt.timeInterval !== undefined) {
            query += ` GROUP BY time(${opt.timeInterval}) fill(${opt.fill})`
        }

        Log.debug(query)

        return this.influx
            .queryRaw(query, {
                precision: 'ms',
                database: config.influxdb.database
            })
            .then(data => {
                if (
                    data.results.length > 0 &&
                    data.results[0].series !== undefined &&
                    data.results[0].series.length > 0
                ) {
                    property.values = data.results[0].series[0].values
                } else {
                    property.values = []
                }
                return Promise.resolve(property)
            })
    }

    async countDataPoints(thingId: string, propertyId: string, typeId: string = undefined, from: string, timeInterval: string): Promise<any> {
        let measurement = typeId
        if (measurement === undefined) {
            const property = await this.getOnePropertyById(thingId, propertyId);
            measurement = property.type.id
        }

        let query = `SELECT COUNT(*) FROM ${measurement} WHERE time > ${from} AND "propertyId" = '${propertyId}'`
        if (timeInterval !== undefined) query += ` GROUP BY time(${timeInterval})`

        return this.influx
            .queryRaw(query, {
                precision: 'ms',
                database: config.influxdb.database
            })
            .then(data => {
                if (data.results[0].series === undefined) return Promise.resolve([])
                return Promise.resolve(data.results[0].series[0].values)
            })
            .catch(error => {
                return error
            })
    }

    async lastDataPoints(thingId: string, propertyId: string) {
        const property = await this.getOnePropertyById(thingId, propertyId);
        return this.influx
            .queryRaw(`SELECT * FROM ${property.type.id}  WHERE "propertyId" = '${property.id}' ORDER BY DESC LIMIT 1`, {
                precision: 'ms',
                database: config.influxdb.database
            })
            .then(data => {
                return Promise.resolve(data.results[0].series[0].values)
            })
            .catch(error => {
                return error
            })
    }
}

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}