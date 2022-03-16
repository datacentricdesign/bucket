import { getRepository, DeleteResult, getConnection } from "typeorm";

import { Thing } from "./Thing";
import { DCDError } from "@datacentricdesign/types";
import { v4 as uuidv4 } from "uuid";

import { Property } from "./property/Property";
import { AuthService } from "../auth/AuthService";
import jwkToBuffer = require("jwk-to-pem");
import { PropertyService } from "./property/PropertyService";
import { PolicyService } from "../policy/PolicyService";

export class ThingService {
  private static instance: ThingService;

  public static getInstance(): ThingService {
    if (ThingService.instance === undefined) {
      ThingService.instance = new ThingService();
    }
    return ThingService.instance;
  }

  private propertyService: PropertyService;
  private policyService: PolicyService;
  private authService: AuthService;

  private constructor() {
    this.propertyService = PropertyService.getInstance();
    this.policyService = PolicyService.getInstance();
    this.authService = AuthService.getInstance();
  }

  /**
   * Create a new Thing.
   *
   * @param {Thing} thing
   * returns Thing
   **/
  async createNewThing(thing: Thing): Promise<Thing> {
    // Save thing in the relational database
    return this.saveNewThing(thing)
      .then((createdThing) => {
        // create the necessary ACPs for the owner and thing itself
        return this.createACPsForNewThing(createdThing);
      })
      .catch((error) => {
        return Promise.reject(error);
      });
  }

  async saveNewThing(thing: Thing): Promise<Thing> {
    // Try to retrieve Thing from the database
    const thingRepository = getRepository(Thing);
    try {
      await thingRepository.findOneOrFail(thing.id);
      // Read positive, the Thing already exist
      return Promise.reject(
        new DCDError(400, `Thing ${thing.id} already exist.`)
      );
    } catch (findError) {
      // Read negative, the Thing does not exist yet
      if (findError.name === "EntityNotFound") {
        return thingRepository.save(thing);
      }
      // unknown error to report
      return Promise.reject(findError);
    }
  }

  async createACPsForNewThing(thing: Thing): Promise<Thing> {
    await this.policyService.grant(thing.personId, thing.id, "owner");
    await this.policyService.grant(thing.id, thing.id, "subject");
    return thing;
  }

  generateThingID(): string {
    return "dcd:things:" + uuidv4();
  }

  /**
   * List some Things.
   * @param {string} actorId
   **/
  getThingsOfAPerson(personId: string): Promise<Thing[]> {
    // Get things from the database
    const thingRepository = getRepository(Thing);
    return thingRepository.find({
      where: { personId: personId },
      relations: ["properties", "properties.type"],
    });
  }

  /**
   * Read a Thing.
   * @param {string} thingId
   * returns {Thing}
   **/
  async getOneThingById(thingId: string): Promise<Thing> {
    // Get things from the database
    const thingRepository = getRepository(Thing);
    const thing = await thingRepository
      .createQueryBuilder("thing")
      .leftJoinAndSelect("thing.properties", "properties")
      .leftJoinAndSelect("properties.type", "type")
      .leftJoinAndSelect("type.dimensions", "dimensions")
      .where("thing.id = :thingId")
      .setParameters({ thingId: thingId })
      .getOne();

    return thing;
  }

  /**
   * Edit one Thing
   * @param thingId
   * returns Promise
   **/
  editOneThing(thing: Thing): Promise<Thing> {
    const thingRepository = getRepository(Thing);
    return thingRepository.save(thing);
  }

  editThingPEM(thingId: string, pem: string): Promise<jwkToBuffer.JWK> {
    return this.authService.setPEM(thingId, pem);
  }

  /**
   * Delete one thing
   * @param thingId
   * @return {Promise}
   */
  async deleteOneThing(thingId: string): Promise<DeleteResult> {
    const thingRepository = getRepository(Thing);
    try {
      await thingRepository.findOneOrFail(thingId);
    } catch (error) {
      throw new DCDError(
        404,
        "Thing to delete " + thingId + " could not be not found."
      );
    }
    await getConnection()
      .createQueryBuilder()
      .delete()
      .from(Property)
      .where("thing.id = :thingId", { thingId })
      .execute();
    return thingRepository.delete(thingId);
  }

  async countDataPoints(
    personId: string,
    from: string,
    timeInterval: string
  ): Promise<Thing[]> {
    const things = await this.getThingsOfAPerson(personId);
    for (let i = 0; i < things.length; i++) {
      const thing = things[i];
      for (let j = 0; j < thing.properties.length; j++) {
        const property: Property = thing.properties[j];
        const result = await this.propertyService.countDataPoints(
          thing.id,
          property.id,
          property.type.id,
          from,
          timeInterval
        );
        property.values = result;
      }
    }
    return things;
  }
}
