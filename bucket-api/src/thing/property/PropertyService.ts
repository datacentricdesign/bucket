import { getRepository, DeleteResult } from "typeorm";

import { DCDError, ValueOptions, DTOProperty } from "@datacentricdesign/types";

import { v4 as uuidv4 } from "uuid";
import {
  FluxTableMetaData,
  InfluxDB,
  Point,
} from "@influxdata/influxdb-client";
import { DeleteAPI, SetupAPI } from "@influxdata/influxdb-client-apis";
import PropertyTypeService from "./propertyType/PropertyTypeService";

import config from "../../config";

import Property from "./Property";
import Log from "../../Log";
import PropertyType from "./propertyType/PropertyType";
import { AccessControlPolicy, PolicyService } from "../services/PolicyService";
import Thing from "../Thing";

interface SharedProperties {
  propertyIdArray: string[];
  resourceOriginMap: Map<string, string[]>;
}

class PropertyService {
  private influx: InfluxDB;

  private url: string;

  private org: string;

  private bucket: string;

  private token: string;

  private ready = false;

  private cachedTypes: Map<string, PropertyType>;

  // private thingService: ThingService;
  private policyService: PolicyService;

  private propertyTypeService: PropertyTypeService;

  private static instance: PropertyService;

  private static consumers: unknown[] = [];

  public static async getInstance(
    consumer: unknown,
    delayMs = 1000
  ): Promise<PropertyService> {
    if (PropertyService.instance === undefined) {
      PropertyService.instance = new PropertyService();
      await PropertyService.instance.init(delayMs);
    }
    PropertyService.consumers.push(consumer);
    return PropertyService.instance;
  }

  /**
   * If delayMs is defined, the constructor init InfluxDB,
   * otherwise it only instantiate the service
   * @constructor
   */
  constructor() {
    this.policyService = PolicyService.getInstance();
    this.propertyTypeService = PropertyTypeService.getInstance();
    this.cachedTypes = new Map<string, PropertyType>();
  }

  isReady(): boolean {
    return this.ready;
  }

  async init(delayMs: number): Promise<void> {
    Log.debug("PropertyService > Init...");
    // Connect to the time series database
    this.influx = new InfluxDB(config.influxdb);
    this.url = config.influxdb.url;
    this.token = config.influxdb.token;
    this.org = config.influxdb.org;
    this.bucket = config.influxdb.bucket;

    const setupApi = new SetupAPI(this.influx);
    return setupApi
      .getSetup()
      .then(async ({ allowed }) => {
        if (allowed) {
          await setupApi.postSetup({
            body: {
              org: this.org,
              bucket: this.bucket,
              username: config.influxdb.username,
              password: config.influxdb.password,
              token: this.token,
            },
          });
          Log.info(`InfluxDB '${this.url}' is now onboarded.`);
        } else {
          Log.info(`InfluxDB '${this.url}' has been already onboarded.`);
        }
        this.ready = true;
        return Promise.resolve();
      })
      .catch((error) => {
        Log.error(error);
        Log.info(`Retrying to connect to InfluxDB in ${delayMs} ms.`);
        PropertyService.delay(delayMs).then(() => {
          this.init(delayMs * 1.5);
        });
      });
  }

  static async release(consumer: unknown): Promise<void> {
    let itemsProcessed = 0;
    let itemsRemoved = 0;
    return new Promise((resolve, reject) => {
      if (PropertyService.consumers.length === 0) {
        return reject();
      }
      PropertyService.consumers.forEach((item, index, array) => {
        itemsProcessed += 1;
        if (item === consumer) {
          array.splice(index, 1);
          itemsRemoved = itemsProcessed + 1;
        }
        if (itemsProcessed === array.length + itemsRemoved) {
          if (array.length === 0) {
            PropertyService.instance = undefined;
          }
          if (itemsRemoved !== 0) {
            return resolve();
          }
          return reject();
        }
      });
    });
  }

  getCache(): Map<string, PropertyType> {
    return this.cachedTypes;
  }

  /**
   * Create a new Property.
   * */
  async createNewProperty(
    thing: Thing,
    dtoProperty: DTOProperty
  ): Promise<Property> {
    Log.debug("Create new property...");
    // Check if the service is ready
    if (!this.ready) {
      return Promise.reject(new DCDError(503, "Property Service not ready."));
    }
    // Check if property type id is provided
    if (dtoProperty.typeId === undefined || dtoProperty.typeId === "") {
      return Promise.reject(new DCDError(4003, "Add field typeId."));
    }
    const property: Property = new Property();
    // Retrieve the property type
    property.type = await PropertyTypeService.getOnePropertyTypeById(
      dtoProperty.typeId
    );
    property.thing = thing;
    // If no name was provided, then use the generic type's
    property.name =
      dtoProperty.name === undefined || dtoProperty.name === ""
        ? property.type.name
        : dtoProperty.name;
    // If no description was provided, then use the generic type's
    property.description =
      dtoProperty.description === undefined || dtoProperty.description === ""
        ? property.type.description
        : dtoProperty.description;
    // Generate a new id with the property prefix
    property.id = `dcd:properties:${uuidv4()}`;
    // Try to retrieve Property from the database
    const propertyRepository = getRepository(Property);
    await propertyRepository.save(property);
    return property;
  }

  /**
   * List the Properties of a Thing.
   * @param {string} thingId
   * */
  async getPropertiesOfAThing(thingId: string): Promise<Property[]> {
    // Check if the service is ready
    if (!this.ready) {
      return Promise.reject(new DCDError(503, "Property Service not ready."));
    }
    // Get properties from the database
    const propertyRepository = getRepository(Property);
    return propertyRepository
      .createQueryBuilder("property")
      .innerJoinAndSelect("property.thing", "thing")
      .innerJoinAndSelect("property.type", "type")
      .innerJoinAndSelect("type.dimensions", "dimensions")
      .where("thing.id = :thingId")
      .setParameters({ thingId })
      .getMany();
  }

  /**
   * List all accessible Properties.
   * @param {string} subjectId person, thing or group id ()
   * @param {string} audienceId person, thing or group id
   * */
  async getProperties(
    subject: string,
    audienceId: string,
    from: number,
    timeInterval: string
  ): Promise<Property[]> {
    // Check if the service is ready
    if (!this.ready) {
      return Promise.reject(new DCDError(503, "Property Service not ready."));
    }
    // Get an array of group names from the specified audience
    const groups = await this.audienceToGroups(subject, audienceId);
    // Get all consents from these groups
    const consents = await this.getConsentsFromGroupArray(groups);
    // Extract the property id of the consents and their origin (thing they belong to)
    const {
      propertyIdArray,
      resourceOriginMap,
    } = this.consentToSharedProperties(consents);
    // Get the properties
    const properties = await PropertyService.getPropertiesFromList(
      propertyIdArray
    );
    // Get the number of values for each dimension, per time interval
    return this.getSharedPropertyValueCount(
      properties,
      resourceOriginMap,
      from,
      timeInterval
    );
  }

  private async getSharedPropertyValueCount(
    properties: Property[],
    resourceOriginMap: Map<string, string[]>,
    from?: number,
    timeInterval?: string
  ) {
    const to = Date.now();
    for (let i = 0; i < properties.length; i += 1) {
      properties[i].sharedWith = resourceOriginMap[properties[i].id];
      if (from !== undefined && timeInterval !== undefined) {
        properties[i].values = await this.readValuesFromInfluxDB(
          properties[i],
          {
            from,
            to,
            timeInterval,
            fctInterval: "count",
            fill: undefined,
          }
        );
      }
    }
    return properties;
  }

  private async audienceToGroups(
    subject: string,
    audienceId: string
  ): Promise<string[]> {
    let groups = [];
    if (audienceId === "*") {
      groups = await this.policyService.listGroupMembership(subject);
    } else {
      try {
        await this.policyService.checkGroupMembership(subject, audienceId);
        groups.push(audienceId);
      } catch (error) {
        return Promise.reject(error);
      }
    }
    return groups;
  }

  private consentToSharedProperties(
    consents: AccessControlPolicy[]
  ): SharedProperties {
    let propertyIdArray = [];
    const resourceOriginMap = new Map<string, string[]>();
    for (let i = 0; i < consents.length; i += 1) {
      if (consents[i].effect === "allow") {
        for (let j = 0; j < consents[i].resources.length; j += 1) {
          const resource = consents[i].resources[j];
          if (resourceOriginMap.has(resource)) {
            resourceOriginMap.set(
              resource,
              resourceOriginMap.get(resource).concat(consents[i].subjects)
            );
          } else {
            resourceOriginMap.set(resource, consents[i].subjects);
          }
        }
        propertyIdArray = propertyIdArray.concat(consents[i].resources);
      }
    }
    return {
      propertyIdArray,
      resourceOriginMap,
    };
  }

  private async getConsentsFromGroupArray(
    groups: string[]
  ): Promise<AccessControlPolicy[]> {
    // Get the list of all consent concerning the current subject
    let consents = [];
    for (let i = 0; i < groups.length; i += 1) {
      try {
        const result = await this.policyService.listConsents(
          "subject",
          groups[i]
        );
        consents = consents.concat(result);
      } catch (error) {
        // Nothing to do
      }
    }
    return consents;
  }

  private static getPropertiesFromList(
    propertyIdArray: string[]
  ): Promise<Property[]> {
    // Get properties from the database
    const propertyRepository = getRepository(Property);
    return propertyRepository
      .createQueryBuilder("property")
      .innerJoinAndSelect("property.type", "type")
      .innerJoinAndSelect("property.thing", "thing")
      .innerJoinAndSelect("type.dimensions", "dimensions")
      .where("property.id = ANY (:values)")
      .setParameters({ values: propertyIdArray })
      .getMany();
  }

  /**
   * Read a Property.
   * @param {string} propertyId
   * returns {Property}
   * */
  async getOnePropertyById(
    thingId: string,
    propertyId: string,
    valueOptions?: ValueOptions
  ): Promise<Property> {
    // Check if the service is ready
    if (!this.ready) {
      return Promise.reject(new DCDError(503, "Property Service not ready."));
    }
    // Get property from the database
    const propertyRepository = getRepository(Property);
    const property = await propertyRepository
      .createQueryBuilder("property")
      .innerJoinAndSelect("property.thing", "thing")
      .innerJoinAndSelect("property.type", "type")
      .innerJoinAndSelect("type.dimensions", "dimensions")
      .where("property.id = :propertyId AND thing.id = :thingId")
      .setParameters({ propertyId, thingId })
      .getOne();

    if (property !== undefined && valueOptions !== undefined) {
      Log.debug(valueOptions.from);
      property.values = await this.readValuesFromInfluxDB(
        property,
        valueOptions
      );
    }
    return property;
  }

  /**
   * List the Properties of a Thing, of a given type
   * @param {string} thingId
   * */
  async getPropertiesOfAThingByType(
    thingId: string,
    typeId: string
  ): Promise<Property[]> {
    // Check if the service is ready
    if (!this.ready) {
      return Promise.reject(new DCDError(503, "Property Service not ready."));
    }
    // Get properties from the database
    const propertyRepository = getRepository(Property);
    const properties = await propertyRepository
      .createQueryBuilder("property")
      .innerJoinAndSelect("property.thing", "thing")
      .innerJoinAndSelect("property.type", "type")
      .innerJoinAndSelect("type.dimensions", "dimensions")
      .where("thing.id = :thingId AND type.id = :typeId")
      .setParameters({ thingId, typeId })
      .getMany();
    return properties;
  }

  /**
   * Edit one Property
   * @param property
   * returns Promise
   * */
  editOneProperty(property: Property): Promise<Property> {
    // Check if the service is ready
    if (!this.ready) {
      return Promise.reject(new DCDError(503, "Property Service not ready."));
    }
    const propertyRepository = getRepository(Property);
    return propertyRepository.save(property);
  }

  /**
   * Update values of a Property
   * @param property
   * returns Promise
   * */
  async updatePropertyValues(property: Property): Promise<void> {
    // Check if the service is ready
    if (!this.ready) {
      return Promise.reject(new DCDError(503, "Property Service not ready."));
    }
    if (property.type === undefined) {
      property.type = await this.getPropertyType(property.id);
    }
    return this.valuesToInfluxDB(property);
  }

  async getPropertyType(propertyId: string): Promise<PropertyType> {
    // Check if the service is ready
    if (!this.ready) {
      return Promise.reject(new DCDError(503, "Property Service not ready."));
    }
    if (!this.cachedTypes.has(propertyId)) {
      const propertyRepository = getRepository(Property);
      const property: Property = await propertyRepository
        .createQueryBuilder("property")
        .innerJoinAndSelect("property.type", "type")
        .innerJoinAndSelect("type.dimensions", "dimensions")
        .where("property.id = :propertyId")
        .setParameters({ propertyId })
        .getOne();
      this.cachedTypes.set(property.id, property.type);
    }
    return this.cachedTypes.get(propertyId);
  }

  /**
   * Delete one property
   * @param propertyId
   * @return {Promise}
   */
  async deleteOneProperty(thingId: string, propertyId: string): Promise<void> {
    // Check if the service is ready
    if (!this.ready) {
      return Promise.reject(new DCDError(503, "Property Service not ready."));
    }
    const propertyRepository = getRepository(Property);
    const property: Property = await this.getOnePropertyById(
      thingId,
      propertyId
    );
    if (property === undefined) {
      throw new DCDError(
        404,
        `Property to delete ${propertyId} could not be found for Thing ${thingId}.`
      );
    }
    return propertyRepository
      .delete(propertyId)
      .then((result: DeleteResult) => {
        if (result.affected === 1) {
          return Promise.resolve();
        }
        return Promise.reject(
          new DCDError(
            500,
            `Unexpected number of deleted properties: ${result.affected}`
          )
        );
      })
      .then(() => {
        const deleteApi = new DeleteAPI(this.influx);
        deleteApi.postDelete({
          body: {
            start: "1970-01-01T00:00:00Z",
            stop: new Date().toISOString(),
            predicate: `thingId="${thingId}" AND propertyId="${propertyId}"`,
          },
          org: this.org,
          bucket: this.bucket,
        });
      })
      .catch((error) => {
        return Promise.reject(new DCDError(500, error.message));
      });
  }

  /**
   * @param {Property} property
   */
  private valuesToInfluxDB(property: Property): Promise<void> {
    // Check if the service is ready
    if (!this.ready) {
      return Promise.reject(new DCDError(503, "Property Service not ready."));
    }
    const points = [];
    const { dimensions } = property.type;
    for (let index = 0; index < property.values.length; index += 1) {
      let ts: number;
      const values: Array<string | number> = property.values[index];
      if (
        values.length - 1 === dimensions.length ||
        values.length === dimensions.length
      ) {
        if (values.length === dimensions.length) {
          // missing time, take from server
          ts = Date.now();
        } else {
          ts =
            typeof values[0] === "string"
              ? Number.parseInt(`${values[0]}`, 10)
              : values[0];
        }

        const point = new Point(property.type.id)
          .tag("propertyId", property.id)
          .tag("thingId", property.thing.id)
          .tag("personId", property.thing.personId);

        for (let i = 1; i < values.length; i += 1) {
          const { name } = dimensions[i - 1];
          switch (dimensions[i - 1].type) {
            case "string":
              point.stringField(name, values[i]);
              break;
            case "number":
              point.floatField(name, values[i]);
              break;
            case "boolean":
              point.booleanField(name, values[i]);
              break;
            default:
              Log.warn(
                `Cannot fit type ${dimensions[i - 1].type} in point field.`
              );
          }
        }
        point.timestamp(ts);
        points.push(point);
      }
    }

    const writeApi = this.influx.getWriteApi(this.org, this.bucket, "ms");
    writeApi.writePoints(points);
    return writeApi.close();
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
  private readValuesFromInfluxDB(
    property: Property,
    opt: ValueOptions
  ): Promise<Array<Array<string | number>>> {
    // Check if the service is ready
    if (!this.ready) {
      return Promise.reject(new DCDError(503, "Property Service not ready."));
    }

    const queryApi = new InfluxDB({
      url: this.url,
      token: this.token,
    }).getQueryApi(this.org);
    let fluxQuery = `from(bucket:"${this.bucket}") `;

    if (opt.from !== undefined && opt.to !== undefined) {
      const start = new Date(opt.from).toISOString();
      const end = new Date(opt.to).toISOString();
      fluxQuery += `|> range(start: ${start}, stop: ${end})`;
    }
    fluxQuery += ` |> filter(fn: (r) => r["_measurement"] == "${property.type.id}")`;
    fluxQuery += ` |> filter(fn: (r) => r["propertyId"] == "${property.id}")`;
    fluxQuery += ` |> filter(fn: (r) => r["thingId"] == "${property.thing.id}")`;
    fluxQuery += ` |> filter(fn: (r) =>`;
    for (let index = 0; index < property.type.dimensions.length; index += 1) {
      if (index > 0) {
        fluxQuery += ` or `;
      }
      fluxQuery += ` r["_field"] == "${property.type.dimensions[index].name}" `;
    }
    fluxQuery += ")";

    if (opt.timeInterval !== undefined) {
      fluxQuery += ` |> aggregateWindow(every: ${opt.timeInterval}, fn: ${opt.fctInterval}, createEmpty: false)`;
    }

    fluxQuery += ` |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")`;

    return new Promise((resolve, reject) => {
      const values = [];
      queryApi.queryRows(fluxQuery, {
        next(row: string[], tableMeta: FluxTableMetaData) {
          const o = tableMeta.toObject(row);
          const val = [Date.parse(o._time)];
          for (
            let index = 0;
            index < property.type.dimensions.length;
            index += 1
          ) {
            val.push(o[property.type.dimensions[index].name]);
          }
          values.push(val);
        },
        error(error: Error) {
          Log.error(error);
          return reject();
        },
        complete() {
          return resolve(values);
        },
      });
    });
  }

  private static delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default PropertyService;
