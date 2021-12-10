import { getRepository, DeleteResult } from "typeorm";

import { Property } from "./Property";

import { PropertyTypeService } from "./propertyType/PropertyTypeService";

import { DCDError } from "@datacentricdesign/types";

import { v4 as uuidv4 } from "uuid";
import { ValueOptions, DTOProperty } from "@datacentricdesign/types";
import { Log } from "../../Logger";
import { PropertyType } from "./propertyType/PropertyType";
import { PolicyService } from "../../policy/PolicyService";
import { InfluxDbService } from "../../influx/InfluxDbService";
import { Thing } from "../Thing";

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
    property.id = "dcd:properties:" + uuidv4();
    // Try to retrieve Property from the database
    const propertyRepository = getRepository(Property);
    await propertyRepository.save(property);
    return property;
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
      groups.push(actor)
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
        properties[i].values = await this.countDataPoints(
          properties[i].thing.id,
          properties[i].id,
          properties[i].type.id,
          from,
          timeInterval
        );
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

    if (property !== undefined && valueOptions != undefined) {
      return this.influxDbService.readValuesFromInfluxDB(
        property,
        valueOptions
      );
    }

    property.type.dimensions = property.type.dimensions.reverse()

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
      console.log(property.type)
      this.cachedTypes[propertyId] = property.type;
    }
    return this.cachedTypes[propertyId];
  }

  /**
   * Delete one property
   * @param propertyId
   * @return {Promise}
   */
  async deleteOneProperty(
    thingId: string,
    propertyId: string
  ): Promise<DeleteResult> {
    const propertyRepository = getRepository(Property);
    const property: Property = await this.getOnePropertyById(
      thingId,
      propertyId
    );
    if (property === undefined) {
      throw new DCDError(
        404,
        "Property to delete " +
          propertyId +
          " could not be not found for Thing " +
          thingId +
          "."
      );
    }
    return propertyRepository.delete(propertyId);
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
      const property = await this.getOnePropertyById(thingId, propertyId);
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
    const property = await this.getOnePropertyById(thingId, propertyId);
    return this.influxDbService.lastDataPoints(property);
  }
}
