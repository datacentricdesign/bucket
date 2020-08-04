
import { getRepository, DeleteResult } from "typeorm";

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

export class PropertyService {

    static propertyTypeService = new PropertyTypeService();
    static thingService = new ThingService();
    private influx: InfluxDB
    private ready: boolean = false

    /**
     *
     * @constructor
     */
    constructor() {
        this.init(1000)
    }

    async init(delayMs:number) {
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
                delay(delayMs).then(()=>{
                    this.init(delayMs*1.5);
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
        const property:Property= new Property()
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
        this.toKafka(property);
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
        // return propertyRepository.find({ where: { thingId: thingId },
        //     relations: ['type', 'type.dimensions', 'thing']
        //   })
        //     .then( async (properties: Property[]) => {
        //         if (valueOptions != undefined) {
        //             const propWithValues = []
        //             for (let index in properties) {
        //                 propWithValues.push(await this.readValuesFromInfluxDB(properties[index], valueOptions))
        //             }
        //             return Promise.resolve(propWithValues)
        //         }
        //         return Promise.resolve(properties)
        //     })
    }

    /**
     * Read a Property.
     * @param {string} propertyId
     * returns {Property}
     **/
    async getOnePropertyById(thingId:string, propertyId: string, valueOptions?: ValueOptions) {
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
            return this.readValuesFromInfluxDB(property, valueOptions)
        }
        return property
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
    updatePropertyValues(property: Property) {
        return this.valuesToInfluxDB(property)
    }

    /**
     * Delete one property
     * @param propertyId
     * @return {Promise}
     */
    async deleteOneProperty(thingId: string, propertyId: string): Promise<DeleteResult> {
        const propertyRepository = getRepository(Property);
        let property: Property = await this.getOnePropertyById(thingId,propertyId);
        if (property === undefined) {
            throw new DCDError(404, 'Property to delete ' + propertyId + ' could not be not found for Thing ' + thingId + '.')
        }
        return propertyRepository.delete(propertyId);
    }

    /**
     * Send Property to Kafka.
     * @param {Property} property
     */
    toKafka(property: Property) {
        return Promise.resolve();
        // return this.kafka.pushData('properties', [property], property.id)
    }

    /**
     * @param {Property} property
     */
    private valuesToInfluxDB(property:Property) {
        const points = [];
        const dimensions = property.type.dimensions;
        for (let index in property.values) {
            let ts:any;
            const values:Array<string|number> = property.values[index]
            console.log(values)
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
                    time: ts
                };
                points.push(point);
            }
        }
        return this.influx.writePoints(points);
    }


    /**
     * @param {Property} property
     * @param {number} from
     * @param {number} to
     * @param {string} timeInterval
     * @param {string} fctInterval
     * @param {string} fill
     * @return {Promise<any>}
     */
    private readValuesFromInfluxDB(property:Property, opt: ValueOptions) {
        console.log(opt)
        let query = `SELECT time`
        for (let index in property.type.dimensions) {
        if (opt.timeInterval !== undefined) {
            query += `, ${opt.fctInterval}(${property.type.dimensions[index].name})`
        } else {
            query += `, ${property.type.dimensions[index].name} `
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
}

function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}