import {Request, Response, Router, NextFunction} from "express";
import {getRepository, DeleteResult} from "typeorm";
import {validate} from "class-validator";

import { Property } from "./Property";
import { Thing } from "../Thing";

import { PropertyService } from "./PropertyService"
import { ThingService } from "../services/ThingService"

import { DCDError } from "../../types/DCDError";
import { ValueOptions, DTOProperty } from "../../types";

export class PropertyController {

    static propertyService = new PropertyService();
    static thingService = new ThingService();

    static parseValueOptions(req: Request): ValueOptions {
        return {
            from: Number.parseInt(req.query.from + ""),
            to: Number.parseInt(req.query.to + ""),
            timeInterval: req.query.timeInterval !== undefined ? req.query.timeInterval + "" : undefined,
            fctInterval: req.query.fctInterval !== undefined ? req.query.fctInterval + "" : undefined,
            fill: req.query.fill !== undefined ? req.query.fill + "" : "none"
        }
    }

    static getPropertiesOfAThing = async (req: Request, res: Response) => {
        // Get the ID from the url
        const thingId: string = req.params.thingId;
        // Get things from Service
        try {
            const properties: Property[] = await PropertyController.propertyService.getPropertiesOfAThing(thingId)
            // Send the things object
            res.send(properties);
        } catch(error) {
            res.status(404).send(error);
        }
    };

    static getOnePropertyById = async (req: Request, res: Response) => {
        // Get the ID from the url
        const thingId: string = req.params.thingId;
        const propertyId = req.params.propertyId;
        const options = PropertyController.parseValueOptions(req)

        // Get the Property from the Service
        const property: Property = await PropertyController.propertyService.getOnePropertyById(thingId, propertyId, options)
        
        // Double-check the property is actually part of this thing
        if (property === undefined) {
            // If not found, send a 404 response
            res.status(404).send("Property not found in the thing.");
            return;
        }
        return res.send(property);
    };

    static createNewProperty = async (req: Request, res: Response, next: NextFunction) => {
        // Get parameters from the body
        let {name, description, typeId} = req.body;
        let property:DTOProperty = {};
        property.name = name;
        property.description = description
        property.typeId = typeId

        // Validade if the parameters are ok
        const errors = await validate(property);
        if (errors.length > 0) {
            return res.status(400).send(errors);
        }

        try {
            const createdProperty = await PropertyController.propertyService.createNewProperty(req.params.thingId, property)
            // If all ok, send 201 response
            return res.status(201).send(createdProperty);
        } catch (error) {
            return next(error)
        }
    };

    static editProperty = async (req: Request, res: Response) => {
        // Get the ID from the url
        const thingId = req.params.thingId;
        const propertyId = req.params.propertyId;
        // Get values from the body
        const {name, description} = req.body;
        let property: Property = await PropertyController.propertyService.getOnePropertyById(thingId, propertyId)
        if (property === undefined) {
            // If not found, send a 404 response
            res.status(404).send("Property not found");
            return;
        }

        // Validate the new name/description on model
        property.name = name;
        property.description = description;
        const errors = await validate(property);
        if (errors.length > 0) {
            res.status(400).send(errors);
            return;
        }

        // Try to save
        try {
            await PropertyController.propertyService.editOneProperty(property)
        } catch (e) {
            res.status(500).send("failed updating property");
            return;
        }
        // After all send a 204 (no content, but accepted) response
        res.status(204).send();
    };

    static updatePropertyValues = async (req: Request, res: Response) => {
        // Get the ID from the url
        const thingId = req.params.thingId;
        const propertyId = req.params.propertyId;
        // Get values from the body
        const {values} = req.body;
        let property: Property = await PropertyController.propertyService.getOnePropertyById(thingId, propertyId)

        // Double-check the property is actually part of this thing
        if (property === undefined) {
            // If not found, send a 404 response
            res.status(404).send("Property not found in the thing.");
            return;
        }

        property.values = values

        // Try to save
        try {
            await PropertyController.propertyService.updatePropertyValues(property)
        } catch (e) {
            console.log(e)
            res.status(500).send("failed updating property values");
            return;
        }
        // After all send a 204 (no content, but accepted) response
        res.status(204).send();
    };

    static deleteOneProperty = async (req: Request, res: Response, next: NextFunction) => {
        // Get the property ID from the url
        const thingId = req.params.thingId;
        const propertyId = req.params.propertyId;
        // Call the Service
        try {
            await PropertyController.propertyService.deleteOneProperty(thingId, propertyId)
            // After all send a 204 (no content, but accepted) response
            res.status(204).send();
        } catch(error) {
            next(error)
        }
    };
};

export default PropertyController;
