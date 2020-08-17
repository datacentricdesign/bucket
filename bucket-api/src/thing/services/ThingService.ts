
import { getRepository, DeleteResult} from "typeorm";

import { Thing } from "../Thing";
import { DCDError } from "@datacentricdesign/types";

import { v4 as uuidv4 } from 'uuid';
import PropertyController from "../property/PropertyController";
import { Property } from "../property/Property";
import { AuthController } from "../http/AuthController";

export interface Token {
    aud: string,
    exp: Number
}

export class ThingService {

    /**
     * Create a new Thing.
     *
     * @param {string} actorId
     * @param {Thing} thing
     * @param {boolean} jwt
     * returns Thing
     **/
    async createNewThing(thing: Thing): Promise<Thing> {
        // Check Thing input
        if (thing.name === undefined || thing.name === '') {
            return Promise.reject(new DCDError(4003, 'Add field name.'))
        }
        if (thing.type === undefined || thing.type === '') {
            return Promise.reject(new DCDError(4003, 'Add field type.'))
        }
        thing.id = "dcd:things:" + uuidv4()

        // Try to retrieve Thing from the database
        const thingRepository = getRepository(Thing);
        try {
            await thingRepository.findOneOrFail(thing.id)
            // Read positive, the Thing already exist
            return Promise.reject({
                code: 400,
                message: 'Thing ' + thing.id + ' already exist.'
            })
        } catch (findError) {
            // Read negative, the Thing does not exist yet
            if (findError.name === "EntityNotFound") {
                await thingRepository.save(thing);
                await AuthController.policyService.grant(thing.personId, thing.id, 'owner');
                await AuthController.policyService.grant(thing.id, thing.id, 'subject');
                return thing;
            }
            // unknown error to report
            throw findError;
        }
    }

    /**
     * List some Things.
     * @param {string} actorId
     **/
    getThingsOfAPerson(personId: string): Promise<Thing[]> {
        // Get things from the database
        const thingRepository = getRepository(Thing);
        return thingRepository.find({ where: { personId: personId }, relations: ["properties", "properties.type"] });
    }

    /**
     * Read a Thing.
     * @param {string} thingId
     * returns {Thing}
     **/
    async getOneThingById(thingId: string) {
        // Get things from the database
        const thingRepository = getRepository(Thing);
        let thing = await thingRepository
                                .createQueryBuilder("thing")
                                .leftJoinAndSelect("thing.properties", "properties")
                                .leftJoinAndSelect("properties.type", "type")
                                .leftJoinAndSelect("type.dimensions", "dimensions")
                                .where("thing.id = :thingId")
                                .setParameters({ thingId: thingId })
                                .getOne();

        return thing
    }

    /**
     * Edit one Thing
     * @param thingId
     * returns Promise
     **/
    editOneThing(thing: Thing) {
        const thingRepository = getRepository(Thing);
        return thingRepository.save(thing);
    }

    editThingPEM(thingId: string, pem: string) {
        return AuthController.authService.setPEM(thingId, pem)
    }

    /**
     * Delete one thing
     * @param thingId
     * @return {Promise}
     */
    async deleteOneThing(thingId: string): Promise<DeleteResult> {
        const thingRepository = getRepository(Thing);
        let thing: Thing;
        try {
            thing = await thingRepository.findOneOrFail(thingId);
        } catch (error) {
            throw new DCDError( 404, 'Thing to delete ' + thingId + ' could not be not found.')
        }
        return thingRepository.delete(thingId);
    }

    /**
     * Generate a JWK set of keys for a given thing id.
     * @param {string} thingId
     * @returns {Promise<Object>}
     */
    generateKeys(thingId: string) {
        const jwkParams = {
            kid: uuidv4(),
            alg: 'RS256',
            use: 'sig'
        }
        return AuthController.authService.refresh().then(() => {
            return AuthController.authService.generateJWK(thingId, jwkParams)
        })
    }

    async countDataPoints(personId, from, timeInterval): Promise<any> {
        const things = await this.getThingsOfAPerson(personId);
        for (let i=0;i<things.length;i++) {
            const thing = things[i]
            for (let j=0; j<thing.properties.length;j++) {
                const property:Property = thing.properties[j]
                const result = await PropertyController.propertyService.countDataPoints(thing.id, property.id, property.type.id, from, timeInterval)
                property.values = result
            }
        }
        return things
    }
}
