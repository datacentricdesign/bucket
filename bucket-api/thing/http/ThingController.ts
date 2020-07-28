import {Request, Response, Router, NextFunction} from "express";
import {getRepository, DeleteResult} from "typeorm";
import {validate} from "class-validator";

import {Thing} from "../Thing";
import {ThingService} from "../services/ThingService"
import { DCDError } from "@datacentricdesign/types";

export class ThingController {

    static thingService = new ThingService();

    static apiHealth = async (req: Request, res: Response) => {
        res.send({status: "OK"});
    };

    static getThingsOfAPerson = async (req: Request, res: Response) => {
        // Get things from Service
        try {
            const things: Thing[] = await ThingController.thingService.getThingsOfAPerson(req.context.userId)
            // Send the things object
            res.send(things);
        } catch(error) {
            res.status(404).send(error);
        }
    };

    static getOneThingById = async (req: Request, res: Response) => {
        // Get the ID from the url
        const thingId: string = req.params.thingId;
        try {
            // Get the Thing from the Service
            const thing: Thing = await ThingController.thingService.getOneThingById(thingId)
            res.send(thing);
        } catch (error) {
            res.status(404).send("Thing not found");
        }
    };

    static createNewThing = async (req: Request, res: Response, next: NextFunction) => {
        // Get parameters from the body
        let {name, description, type} = req.body;
        let thing = new Thing();
        thing.name = name;
        thing.description = description
        thing.type = type

        // Get thing creator identity from the request context
        thing.personId = req.context.userId

        // Validade if the parameters are ok
        const errors = await validate(thing);
        if (errors.length > 0) {
            return res.status(400).send(errors);
        }

        try {
            const createdThing = await ThingController.thingService.createNewThing(thing)
            // If all ok, send 201 response
            return res.status(201).send(createdThing);
        } catch (error) {
            return next(error)
        }
    };

    static editThing = async (req: Request, res: Response) => {
        // Get the ID from the url
        const thingId = req.params.thingId;
        // Get values from the body
        const {name, description} = req.body;
        let thing: Thing;
        try {
            thing = await ThingController.thingService.getOneThingById(thingId)
        } catch (error) {
            // If not found, send a 404 response
            res.status(404).send("Thing not found");
            return;
        }

        // Validate the new values on model
        thing.name = name;
        thing.description = description;
        const errors = await validate(thing);
        if (errors.length > 0) {
            res.status(400).send(errors);
            return;
        }

        // Try to save
        try {
            await ThingController.thingService.editOneThing(thing)
        } catch (e) {
            res.status(500).send("failed updating thing");
            return;
        }
        //After all send a 204 (no content, but accepted) response
        res.status(204).send();
    };

    static editThingPEM = async (req: Request, res: Response) => {
        // Get the thing ID from the url
        const thingId = req.params.thingId;
        // Get pem from body
        const pem = req.params.body;
        // Call the Service
        await ThingController.thingService.editThingPEM(thingId, pem)
    }

    static deleteOneThing = async (req: Request, res: Response, next: NextFunction) => {
        // Get the thing ID from the url
        const thingId = req.params.thingId;
        // Call the Service
        try {
            await ThingController.thingService.deleteOneThing(thingId)
            // After all send a 204 (no content, but accepted) response
            res.status(204).send();
        } catch(error) {
            next(error)
        }
    };
};

export default ThingController;
