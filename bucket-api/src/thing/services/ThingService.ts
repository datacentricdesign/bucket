import { AuthService, JWKParams, KeySet } from "./AuthService";
import { getConnection, getRepository } from "typeorm";
import { DCDError } from "@datacentricdesign/types";
import { PolicyService } from "./PolicyService";
import { Property } from "../property/Property";
import { PropertyService } from "../property/PropertyService";
import { Thing } from "../Thing";
import { v4 as uuidv4 } from "uuid";

export interface Token {
  aud: string;
  exp: number;
}

export class ThingService {
  private static instance: ThingService;

  public static getInstance(): ThingService {
    if (typeof ThingService.instance === "undefined") {
      ThingService.instance = new ThingService();
    }
    return ThingService.instance;
  }

  private policyService: PolicyService;

  private authService: AuthService;

  private propertyService: PropertyService;

  /**
   *
   */
  constructor() {
    this.policyService = PolicyService.getInstance();
    this.authService = AuthService.getInstance();
    PropertyService.getInstance(this).then(
      (service) => (this.propertyService = service)
    );
  }

  /**
   * Create a new Thing.
   *
   * @param {string} actorId
   * @param {Thing} thing
   * @param {boolean} jwt
   * returns Thing
   *
   */
  async createNewThing(thing: Thing): Promise<Thing> {
    // Check Thing input
    if (typeof thing.name === "undefined" || thing.name === "") {
      return Promise.reject(new DCDError(4003, "Add field name."));
    }
    if (typeof thing.type === "undefined" || thing.type === "") {
      return Promise.reject(new DCDError(4003, "Add field type."));
    }
    // Generate a new thing ID
    thing.id = `dcd:things:${uuidv4()}`;
    // Try to retrieve Thing from the database
    const thingRepository = getRepository(Thing);
    // Save the new thing in Postgres
    await thingRepository.save(thing);
    // Grant priviledges to the thing itself and its owner
    await this.policyService.grant(thing.personId, thing.id, "owner");
    await this.policyService.grant(thing.id, thing.id, "subject");
    return thing;
  }

  /**
   * List some Things.
   * @param {string} actorId
   *
   */
  static getThingsOfAPerson(personId: string): Promise<Thing[]> {
    // Get things from the database
    const thingRepository = getRepository(Thing);
    return thingRepository.find({
      relations: ["properties", "properties.type"],
      where: { personId },
    });
  }

  /**
   * Read a Thing.
   * @param {string} thingId
   * returns {Thing}
   *
   */
  static getOneThingById(thingId: string): Promise<Thing> {
    // Get things from the database
    const thingRepository = getRepository(Thing);
    return thingRepository
      .createQueryBuilder("thing")
      .leftJoinAndSelect("thing.properties", "properties")
      .leftJoinAndSelect("properties.type", "type")
      .leftJoinAndSelect("type.dimensions", "dimensions")
      .where("thing.id = :thingId")
      .setParameters({ thingId })
      .getOne();
  }

  /**
   * Edit one Thing
   * @param thingId
   * returns Promise
   *
   */
  static editOneThing(thing: Thing): Promise<Thing> {
    const thingRepository = getRepository(Thing);
    return thingRepository.save(thing);
  }

  editThingPEM(thingId: string, pem: string): Promise<string> {
    return this.authService.setPEM(thingId, pem);
  }

  /**
   * Delete one thing
   * @param thingId
   * @return {Promise}
   */
  static async deleteOneThing(thingId: string): Promise<void> {
    const thingRepository = getRepository(Thing);
    try {
      await thingRepository.findOneOrFail(thingId);
    } catch (error) {
      throw new DCDError(
        404,
        `Thing to delete ${thingId} could not be not found.`
      );
    }
    await getConnection()
      .createQueryBuilder()
      .delete()
      .from(Property)
      .where("thing.id = :thingId", { thingId })
      .execute();
    return thingRepository
      .delete(thingId)
      .then(() => {
        return Promise.resolve();
      })
      .catch((error) => {
        return Promise.reject(error);
      });
  }

  /**
   * Generate a JWK set of keys for a given thing id.
   * @param {string} thingId
   * @returns {Promise<Object>}
   */
  generateKeys(thingId: string): Promise<KeySet> {
    const jwkParams: JWKParams = {
      alg: "RS256",
      kid: uuidv4(),
      use: "sig",
    };
    return this.authService.refresh().then(() => {
      return this.authService.generateJWK(thingId, jwkParams);
    });
  }

  async countDataPoints(
    personId: string,
    from: number,
    timeInterval: string
  ): Promise<Thing[]> {
    const things = await ThingService.getThingsOfAPerson(personId),
      valueOpt = {
        fctInterval: "count",
        fill: null,
        from,
        timeInterval,
        to: Date.now(),
      };
    for (const thing of things) {
      for (const property of thing.properties) {
        const prop = await this.propertyService.getOnePropertyById(
          thing.id,
          property.id,
          valueOpt
        );
        property.values = prop.values;
      }
    }
    return things;
  }
}
