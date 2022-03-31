import { getRepository } from "typeorm";

import { Property } from "./Property";

import { PropertyTypeService } from "./propertyType/PropertyTypeService";

import { DCDError } from "@datacentricdesign/types";

import { v4 as uuidv4 } from "uuid";
import { ValueOptions, DTOProperty } from "@datacentricdesign/types";
import { PropertyType } from "./propertyType/PropertyType";
import { PolicyService } from "../../policy/PolicyService";
import { InfluxDbService } from "../../influx/InfluxDbService";
import { Thing } from "../Thing";
import { Log } from "../../Logger";
import config from "../../config";
import * as fs from "fs";

export class PropertyService {
  private static instance: PropertyService;

  private policyService: PolicyService;
  private propertyTypeService: PropertyTypeService;

  private influxDbService: InfluxDbService;

  private cachedTypes = {};

  public static getInstance(): PropertyService {
    if (PropertyService.instance === undefined) {
      PropertyService.instance = new PropertyService();
    }
    return PropertyService.instance;
  }

  /**
   * If delayMs is defined, the constructor init InfluxDB,
   * otherwise it only instantiate the service
   * @constructor
   */
  private constructor() {
    this.policyService = PolicyService.getInstance();
    this.propertyTypeService = PropertyTypeService.getInstance();
    this.influxDbService = InfluxDbService.getInstance();
    this.cachedTypes = new Map<string, PropertyType>();
  }

  /**
   * Create a new Property.
   **/
  async createNewProperty(
    thing: Thing,
    dtoProperty: DTOProperty
  ): Promise<Property> {
    // Check if property type id is provided
    if (dtoProperty.typeId === undefined || dtoProperty.typeId === "") {
      return Promise.reject(new DCDError(4003, "Add field typeId."));
    }
    const property: Property = new Property();
    property.thing = thing;
    // Retrieve the property type
    property.type = await this.propertyTypeService.getOnePropertyTypeById(
      dtoProperty.typeId
    );
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
    property.id = this.generatePropertyID();
    // Try to retrieve Property from the database
    const propertyRepository = getRepository(Property);
    return await propertyRepository.save(property);
  }

  generatePropertyID(): string {
    return "dcd:properties:" + uuidv4();
  }

  /**
   * List the Properties of a Thing.
   * @param {string} thingId
   **/
  async getPropertiesOfAThing(thingId: string): Promise<Property[]> {
    // Get properties from the database
    const propertyRepository = getRepository(Property);
    const properties = await propertyRepository
      .createQueryBuilder("property")
      .innerJoinAndSelect("property.thing", "thing")
      .innerJoinAndSelect("property.type", "type")
      .innerJoinAndSelect("type.dimensions", "dimensions")
      .where("thing.id = :thingId")
      .setParameters({ thingId: thingId })
      .getMany();
    return properties;
  }

  /**
   * List all accessible Properties.
   * @param {string} subjectId person, thing or group id ()
   * @param {string} audienceId person, thing or group id
   **/
  async getProperties(
    actor: string,
    subject: string,
    audienceId: string,
    from: string,
    timeInterval: string
  ): Promise<Property[]> {
    let groups = [];
    if (audienceId === "*") {
      groups = await this.policyService.listGroupMembership(subject);
      groups.push(actor);
    } else {
      try {
        await this.policyService.checkGroupMembership(subject, audienceId);
        groups.push(audienceId);
      } catch (error) {
        return Promise.reject(error);
      }
    }

    // Get the list of all consent concerning the current subject
    let consents = [];
    for (let i = 0; i < groups.length; i++) {
      const result = await this.policyService.listConsents(
        "subject",
        groups[i]
      );
      consents = consents.concat(result);
    }

    let resources = [];
    const resourcesOrigin = {};
    for (let i = 0; i < consents.length; i++) {
      if (consents[i].effect === "allow") {
        for (let j = 0; j < consents[i].resources.length; j++) {
          const resource = consents[i].resources[j];
          if (resourcesOrigin[resource] !== undefined) {
            resourcesOrigin[resource] = resourcesOrigin[resource].concat(
              consents[i].subjects
            );
          } else {
            resourcesOrigin[resource] = consents[i].subjects;
          }
        }
        resources = resources.concat(consents[i].resources);
      }
    }

    // Get properties from the database
    const propertyRepository = getRepository(Property);
    const properties = await propertyRepository
      .createQueryBuilder("property")
      .innerJoinAndSelect("property.type", "type")
      .innerJoinAndSelect("property.thing", "thing")
      .innerJoinAndSelect("type.dimensions", "dimensions")
      .where("property.id = ANY (:values)")
      .setParameters({ values: resources })
      .getMany();

    for (let i = 0; i < properties.length; i++) {
      properties[i].sharedWith = resourcesOrigin[properties[i].id];
      if (from !== undefined && timeInterval !== undefined) {
        try {
          properties[i].values = await this.countDataPoints(
            properties[i].thing.id,
            properties[i].id,
            properties[i].type.id,
            from,
            timeInterval
          );
        } catch(error) {
          Log.error(error);
        }
      }
    }

    return properties;
  }

  /**
   * Read a Property.
   * @param {string} propertyId
   * returns {Property}
   **/
  async getOnePropertyById(
    thingId: string,
    propertyId: string,
    valueOptions?: ValueOptions
  ): Promise<Property> {
    // Get property from the database
    const propertyRepository = getRepository(Property);
    const property = await propertyRepository
      .createQueryBuilder("property")
      .innerJoinAndSelect("property.thing", "thing")
      .innerJoinAndSelect("property.type", "type")
      .innerJoinAndSelect("type.dimensions", "dimensions")
      .where("property.id = :propertyId AND thing.id = :thingId")
      .setParameters({ propertyId: propertyId, thingId: thingId })
      .getOne();

    if (property === undefined) {
      return Promise.reject(new DCDError(404, "Property not found."));
    }

    // If the request specify options for values, we fetch those values
    if (valueOptions !== undefined) {
      property.values = await this.influxDbService.readValuesFromInfluxDB(
        property,
        valueOptions
      );
    }

    property.type.dimensions = property.type.dimensions.reverse();

    return property;
  }

  /**
   * List the Properties of a Thing, of a given type
   * @param {string} thingId
   **/
  async getPropertiesOfAThingByType(
    thingId: string,
    typeId: string
  ): Promise<Property[]> {
    // Get properties from the database
    const propertyRepository = getRepository(Property);
    const properties = await propertyRepository
      .createQueryBuilder("property")
      .innerJoinAndSelect("property.thing", "thing")
      .innerJoinAndSelect("property.type", "type")
      .innerJoinAndSelect("type.dimensions", "dimensions")
      .where("thing.id = :thingId AND type.id = :typeId")
      .setParameters({ thingId: thingId, typeId: typeId })
      .getMany();
    return properties;
  }

  /**
   * List Properties by Type Id.
   * @param {string} propertyId
   * returns {Property[]}
   **/
  async getPropertiesByTypeId(
    thingId: string,
    typeId: string
  ): Promise<Property[]> {
    // Get properties from the database
    const propertyRepository = getRepository(Property);
    const properties = await propertyRepository
      .createQueryBuilder("property")
      .innerJoinAndSelect("property.thing", "thing")
      .innerJoinAndSelect("property.type", "type")
      .innerJoinAndSelect("type.dimensions", "dimensions")
      .where("thing.id = :thingId AND type.id = :typeId")
      .setParameters({ thingId: thingId, typeId: typeId })
      .getMany();

    return properties;
  }

  /**
   * Edit one Property
   * @param property
   * returns Promise
   **/
  editOneProperty(property: Property): Promise<Property> {
    const propertyRepository = getRepository(Property);
    return propertyRepository.save(property);
  }

  /**
   * Update values of a Property
   * @param property
   * returns Promise
   **/
  async updatePropertyValues(property: Property): Promise<void> {
    if (property.type === undefined) {
      property.type = await this.getPropertyType(property.id);
    }
    return this.influxDbService.valuesToInfluxDB(property);
  }

  async getPropertyType(propertyId: string): Promise<PropertyType> {
    if (this.cachedTypes[propertyId] === undefined) {
      const propertyRepository = getRepository(Property);
      const property: Property = await propertyRepository
        .createQueryBuilder("property")
        .innerJoinAndSelect("property.type", "type")
        .innerJoinAndSelect("type.dimensions", "dimensions")
        .where("property.id = :propertyId")
        .setParameters({ propertyId: propertyId })
        .getOne();
      console.log(property.type);
      this.cachedTypes[propertyId] = property.type;
    }
    return this.cachedTypes[propertyId];
  }

  /**
   * Delete one property
   * @param propertyId
   * @return {Promise}
   */
  async deleteOneProperty(thingId: string, propertyId: string): Promise<void> {
    const propertyRepository = getRepository(Property);
    // Get all details of that property, ensuring it exists
    let property: Property
    try {
      property = await this.getOnePropertyById(thingId, propertyId);
    } catch {
      // If the property does not exist, we stop the process and return an error
      return Promise.reject(new DCDError(
        404,
        `Property to delete ${propertyId} could not be not found for Thing ${thingId}.`
      ));
    }

    // Attempt to delete the data of the property
    return this.influxDbService
      .deletePropertyData(property)
      .then(() => {
        // If it succeed, attempt to delete the media of the property
        return this.deleteAllPropertyMedia(property);
      })
      .then(() => {
        // If it succeed, attempt to delete the property
        return propertyRepository.delete(propertyId);
      })
      .then(() => {
        // No need to expose any SQL result, return an empty promise
        return Promise.resolve();
      })
      .catch((error) => {
        // If it fails deleting data, return an error without trying to delete the property
        Log.debug(error);
        return Promise.reject(
          new DCDError(404, "Failed to delete property data.")
        );
      });
  }

  async deleteDataPoints(
    thingId: string,
    propertyId: string,
    timestamps: number[]
  ): Promise<void> {
    // Get all details of that property, ensuring it exists
    let property: Property;
    try {
      property = await this.getOnePropertyById(thingId, propertyId);
    } catch {
      // If the property does not exist, we stop the process and return an error
      return Promise.reject(new DCDError(
        404,
        `Property ${propertyId} could not be not found for Thing ${thingId}.`
      ));
    }

    return this.influxDbService
      .deleteDataPoints(property, timestamps)
      .then(() => {
        // If it succeed, attempt to delete the media of the property
        return this.deletePropertyMediaByTimestamp(property, timestamps);
      })
      .catch((error) => {
        return Promise.reject(error);
      });
  }

  async deleteAllPropertyMedia(property: Property): Promise<void> {
    const path = config.hostDataFolder + "/files/";
    // list all files in the directory
    fs.readdir(path, (err, files) => {
      if (err) {
        return Promise.reject(err);
      }
      // files object contains all files names
      files.forEach((file) => {
        if (file.startsWith(property.thing.id + "-" + property.id)) {
          fs.unlink(path + file, (err) => {
            if (err) {
              return Promise.reject(err);
            }
          });
        }
      });
    });
  }

  async deletePropertyMediaByTimestamp(
    property: Property,
    timestamps: number[]
  ): Promise<void> {
    const path =
      config.hostDataFolder + "/files/" + property.thing.id + "-" + property.id;
    const mediaDimensions = [];
    property.type.dimensions.forEach((dimension) => {
      if (dimension.type.includes("/")) {
        mediaDimensions.push(dimension);
      }
    });
    timestamps.forEach((timestamp) => {
      mediaDimensions.forEach((dimension) => {
        fs.unlink(
          `${path}-${timestamp}#${dimension.id}${dimension.unit}`,
          (err) => {
            if (err) {
              return Promise.reject(err);
            }
          }
        );
      });
    });
  }

  async countDataPoints(
    thingId: string,
    propertyId: string,
    typeId: string = undefined,
    from: string,
    timeInterval: string
  ): Promise<(number | string)[][]> {
    let measurement = typeId;
    if (measurement === undefined) {
      let property: Property
      try {
        property = await this.getOnePropertyById(thingId, propertyId);
      } catch (error) {
        return Promise.reject(error);
      }

      measurement = property.type.id;
    }
    return this.influxDbService.counDataPoints(
      measurement,
      from,
      propertyId,
      timeInterval
    );
  }

  async lastDataPoints(
    thingId: string,
    propertyId: string
  ): Promise<(number | string)[][]> {
    return this.getOnePropertyById(thingId, propertyId)
      .then((property) => {
        return this.influxDbService.lastDataPoints(property);
      })

  }
}
