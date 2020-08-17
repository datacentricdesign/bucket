
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

export class PropertyService {

    static propertyTypeService = new PropertyTypeService();
    static thingService = new ThingService();
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
                console.log("Connected to InfluxDb");
                if (names.indexOf(config.influxdb.database) > -1) {
                    await this.influx.createDatabase(config.influxdb.database);
                    this.ready = true;
                }
                this.ready = true
                return Promise.resolve()
            }).catch((error) => {
                console.log(JSON.stringify(error));
                console.log("Retrying to connect to InfluxDB in " + delayMs + " ms.");
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
        property.thing = await PropertyService.thingService.getOneThingById(thingId)
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
     * @param {string} personId
     **/
    async getProperties(subject: string): Promise<Property[]> {
        // Get the list of all consent concerning the current subject
        const consents = await AuthController.policyService.listConsents('subject', subject)
        console.log(consents)
        let resources = []
        for (let i=0;i<consents.length;i++) {
            if (consents[i].effect === 'allow') {
                resources = resources.concat(consents[i].resources)
            }
        }
        // Get properties from the database
        const propertyRepository = getRepository(Property);
        let properties = await propertyRepository
            .createQueryBuilder("property")
            .innerJoinAndSelect("property.type", "type")
            .innerJoinAndSelect("type.dimensions", "dimensions")
            .where("property.id = ANY (:values)")
            .setParameters({ values: resources })
            .getMany();
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
            console.log('hello')
            console.log(valueOptions.from)
            return this.readValuesFromInfluxDB(property, valueOptions)
        }
        return property
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
        console.log(points)
        return this.influx.writePoints(points, {precision: 'ms'});
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
        console.log(opt)
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

        console.log(query)

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

    async countDataPoints(thingId: string, propertyId: string, typeId:string=undefined, from:string, timeInterval): Promise<any> {
        let measurement = typeId
        if (measurement===undefined) {
            const property = await this.getOnePropertyById(thingId, propertyId);
            measurement = property.type.id
        }

        console.log("interval")
        console.log(timeInterval)

        let query = `SELECT COUNT(*) FROM ${measurement} WHERE time > ${from} AND "propertyId" = '${propertyId}'`
        if (timeInterval!==undefined) query += ` GROUP BY time(${timeInterval})`
        
        return this.influx
            .queryRaw(query, {
                precision: 'ms',                                          
                database: config.influxdb.database
            })
            .then(data => {
                console.log(data.results[0])
                if (data.results[0].series===undefined) return Promise.resolve([])
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