import { Request, Response, Router, NextFunction } from "express";
import { getRepository, DeleteResult } from "typeorm";
import { validate } from "class-validator";

import { Thing } from "../Thing";
import { ThingService } from "../services/ThingService"
import { DCDError } from "@datacentricdesign/types";
import config from "../../config";
import fetch from "node-fetch";
import { PolicyService } from "../services/PolicyService";
import { AuthService } from "../services/AuthService";
import { AuthController } from "./AuthController";
import DPiController from "../dpi/DPiController";

export class ThingController {

    static thingService = new ThingService();

    static apiHealth = async (req: Request, res: Response) => {
        res.send({ status: "OK" });
    };

    static getThingsOfAPerson = async (req: Request, res: Response, next: NextFunction) => {
        // Get things from Service
        try {
            const things: Thing[] = await ThingController.thingService.getThingsOfAPerson(req.context.userId)
            // Send the things object
            res.send(things);
        } catch (error) {
            return next(error)
        }
    };

    static getOneThingById = async (req: Request, res: Response, next: NextFunction) => {
        // Get the ID from the url
        const thingId: string = req.params.thingId;
        try {
            // Get the Thing from the Service
            const thing: Thing = await ThingController.thingService.getOneThingById(thingId)
            res.send(thing);
        } catch (error) {
            return next(new DCDError(404, "Thing not found"))
        }
    };

    static createNewThing = async (req: Request, res: Response, next: NextFunction) => {
        // Get parameters from the body
        let { name, description, type, pem, dpi } = req.body;
        let thing = new Thing();
        thing.name = name;
        thing.description = description
        thing.type = type

        // Get thing creator identity from the request context
        thing.personId = req.context.userId

        // Validade if the parameters are ok
        const errors = await validate(thing);
        if (errors.length > 0) {
            return next(new DCDError(400, errors.toString()))
        }

        try {
            const createdThing = await ThingController.thingService.createNewThing(thing)
            if (pem !== undefined && typeof(pem) === 'string') {
                pem.trim()
                const error = checkPEM(pem)
                if (error !== undefined) return next(error)
                await ThingController.thingService.editThingPEM(thing.id, pem)
            }

            if (thing.type === 'RASPBERRYPI' && dpi !== undefined) {
                await DPiController.dpiService.generateDPiImage(dpi, thing.id)
            }

            // If all ok, send 201 response
            return res.status(201).send(createdThing);
        } catch (error) {
            return next(error)
        }
    };

    static editThing = async (req: Request, res: Response, next: NextFunction) => {
        // Get the ID from the url
        const thingId = req.params.thingId;
        // Get values from the body
        const { name, description } = req.body;
        let thing: Thing;
        try {
            thing = await ThingController.thingService.getOneThingById(thingId)
        } catch (error) {
            // If not found, send a 404 response
            return next(new DCDError(404, "Thing not found"))
        }

        // Validate the new values on model
        thing.name = name;
        thing.description = description;
        const errors = await validate(thing);
        if (errors.length > 0) {
            return next(new DCDError(400, errors.toString()))
        }

        // Try to save
        try {
            await ThingController.thingService.editOneThing(thing)
        } catch (error) {
            return next(new DCDError(500, "Failed to update thing"))
        }
        //After all send a 204 (no content, but accepted) response
        res.status(204).send();
    };

    static editThingPEM = async (req: Request, res: Response, next: NextFunction) => {
        // Get the thing ID from the url
        const thingId = req.params.thingId;
        // Get pem from body
        const pem = req.body.pem;
        if (pem !== undefined && typeof(pem) !== 'string') {
            return next(new DCDError(400, "Missing PEM key."))
        }
        pem.trim()
        const error = checkPEM(pem)
        if (error !== undefined) return next(error)
        // Call the Service
        ThingController.thingService.editThingPEM(thingId, pem)
            .then(() => {
                res.status(204).send();
            }).catch((error) => {
                next(error)
            })
    }

    static deleteOneThing = async (req: Request, res: Response, next: NextFunction) => {
        // Get the thing ID from the url
        const thingId = req.params.thingId;
        // Call the Service
        try {
            await ThingController.thingService.deleteOneThing(thingId)
            // After all send a 204 (no content, but accepted) response
            res.status(204).send();
        } catch (error) {
            next(error)
        }
    };

    static countDataPoints = async (req: Request, res: Response, next: NextFunction) => {
        // Get the property ID from the url
        const from = req.query.from;
        const timeInterval = req.query.timeInterval;
        // Call the Service
        try {
            const result = await ThingController.thingService.countDataPoints(req.context.userId, from, timeInterval)
            res.status(200).send(result);
        } catch (error) {
            next(error)
        }
    };

};

export default ThingController;

function checkPEM(pem: string) {
    if (pem === undefined) {
        return new DCDError(400, 'The public key should be provided in the body parameter "pem".')
    }
    if (!pem.startsWith('-----BEGIN PUBLIC KEY-----') ||
        !pem.endsWith('-----END PUBLIC KEY-----')) {
        return new DCDError(400, 'The public key should start with "-----BEGIN PUBLIC KEY-----" and ends with "-----END PUBLIC KEY-----"')
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }