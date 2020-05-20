
import { getRepository, DeleteResult} from "typeorm";

import { Thing } from "./Thing";
import { DCDError } from "../types/DCDError";
import { AuthService } from "./AuthService";
import { PolicyService } from "./PolicyService";

import { v4 as uuidv4 } from 'uuid';
import { envConfig } from "../config/envConfig";

export interface Token {
    aud: string,
    exp: Number
}

export class ThingService {

    private static authService = new AuthService()
    private static policyService = new PolicyService()

    /**
     *
     * @constructor
     */
    constructor() {
    }

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
                this.toKafka(thing);
                if (envConfig.env === 'production') {
                    await ThingService.policyService.grant(thing.personId, thing.id, 'owner');
                    await ThingService.policyService.grant(thing.id, thing.id, 'subject');
                }
                console.log(thing)
                if (thing.pem !== '') {
                    return ThingService.authService.setPEM(thing.id, thing.pem);
                }
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
        return thingRepository.find({ where: { personId: personId } });
    }

    /**
     * Read a Thing.
     * @param {string} thingId
     * returns {Thing}
     **/
    getOneThingById(thingId: string) {
        // Get things from the database
        const thingRepository = getRepository(Thing);
        return thingRepository.findOneOrFail(thingId);
        // let thing = {}
        // return this.model.dao
        //     .readThing(thingId)
        //     .then(result => {
        //         thing = result
        //         return this.model.properties.list(id)
        //     })
        //     .then(results => {
        //         thing.properties = results
        //         return Promise.resolve(thing)
        //     })
        //     .catch(error => {
        //         return Promise.reject(error)
        //     })
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
        return ThingService.authService.setPEM(thingId, pem)
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
     * Send Thing to Kafka.
     * @param {Thing} thing
     */
    toKafka(thing: Thing) {
        return Promise.resolve();
        // return this.kafka.pushData('things', [thing], thing.id)
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
        return ThingService.authService.refresh().then(() => {
            return ThingService.authService.generateJWK(thingId, jwkParams)
        })
    }
}
