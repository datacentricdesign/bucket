import { Request, Response, Router, NextFunction } from "express";
import { getRepository, DeleteResult } from "typeorm";
import { validate } from "class-validator";

import { Property } from "./Property";
import { v4 as uuidv4 } from 'uuid';

import * as multiparty from 'multiparty'

import { PropertyService } from "./PropertyService"

import { ValueOptions, DTOProperty, DCDError } from "@datacentricdesign/types";
import { AuthController } from "../http/AuthController";
import { Dimension } from "./dimension/Dimension";
import { Log } from "../../Logger";
import { nextTick } from "process";

export class PropertyController {

    static propertyService = new PropertyService();


    static parseValueOptions(req: Request): ValueOptions {
        if (req.query.from === undefined || req.query.to === undefined) {
            return undefined
        }
        return {
            from: Number.parseInt(req.query.from + ""),
            to: Number.parseInt(req.query.to + ""),
            timeInterval: req.query.timeInterval !== undefined ? req.query.timeInterval + "" : undefined,
            fctInterval: req.query.fctInterval !== undefined ? req.query.fctInterval + "" : undefined,
            fill: req.query.fill !== undefined ? req.query.fill + "" : "none"
        }
    }

    static getPropertiesOfAThing = async (req: Request, res: Response, next: NextFunction) => {
        // Get the ID from the url
        const thingId: string = req.params.thingId;
        // Get things from Service
        try {
            const properties: Property[] = await PropertyController.propertyService.getPropertiesOfAThing(thingId)
            // Send the things object
            res.send(properties);
        } catch (error) {
            return next(new DCDError(404, error))
        }
    };

    static getProperties = async (req: Request, res: Response, next: NextFunction) => {
        Log.debug(req.context.userId)
        try {
            const properties: Property[] = await PropertyController.propertyService.getProperties(req.context.userId)
            res.send(properties)
        } catch (error) {
            return next(new DCDError(404, error))
        }
    };

    static getOnePropertyById = async (req: Request, res: Response, next: NextFunction) => {
        // Get the ID from the url
        const thingId: string = req.params.thingId;
        const propertyId = req.params.propertyId;
        const options = PropertyController.parseValueOptions(req)

        // Get the Property from the Service
        const property: Property = await PropertyController.propertyService.getOnePropertyById(thingId, propertyId, options)

        if (req.accepts('application/json')) {
            return res.send(property)
        } else if (req.accepts('text/csv')) {
            res.set({ 'Content-Type': 'text/csv' })
            res.send(PropertyController.toCSV(property))
        } else {
            return res.send(property)
        }

        // Double-check the property is actually part of this thing
        if (property === undefined) {
            // If not found, send a 404 response
            return next(new DCDError(404, "Property not found in the thing."))
        }

        return res.send(property);
    };

    static createNewProperty = async (req: Request, res: Response, next: NextFunction) => {
        // Get parameters from the body
        let { name, description, typeId } = req.body;
        let property: DTOProperty = {};
        property.name = name;
        property.description = description
        property.typeId = typeId

        // Validade if the parameters are ok
        const errors = await validate(property);
        if (errors.length > 0) {
            return next(new DCDError(400, errors.toString()))
        }

        try {
            const createdProperty = await PropertyController.propertyService.createNewProperty(req.params.thingId, property)
            // If all ok, send 201 response
            return res.status(201).send(createdProperty);
        } catch (error) {
            return next(error)
        }
    };

    static editProperty = async (req: Request, res: Response, next: NextFunction) => {
        // Get the ID from the url
        const thingId = req.params.thingId;
        const propertyId = req.params.propertyId;
        // Get values from the body
        const { name, description } = req.body;
        let property: Property = await PropertyController.propertyService.getOnePropertyById(thingId, propertyId)
        if (property === undefined) {
            // If not found, send a 404 response
            return next(new DCDError(404, "Property not found"))
        }

        // Validate the new name/description on model
        property.name = name;
        property.description = description;
        const errors = await validate(property)
        if (errors.length > 0) {
            return next(new DCDError(400, errors.toString()))
        }

        // Try to save
        try {
            await PropertyController.propertyService.editOneProperty(property)
        } catch (e) {
            return next(new DCDError(500, "failed updating property"))
        }
        // After all send a 204 (no content, but accepted) response
        res.status(204).send();
    };

    static updatePropertyValues = async (req: Request, res: Response, next: NextFunction) => {
        Log.debug('update property values')
        // Get the ID from the url
        const thingId = req.params.thingId
        const propertyId = req.params.propertyId
        // Get values from the body
        const { values } = req.body;
        let property: Property = await PropertyController.propertyService.getOnePropertyById(thingId, propertyId)

        // Double-check the property is actually part of this thing
        if (property === undefined) {
            // If not found, send a 404 response
            return next(new DCDError(404, "Property not found in the thing."))
        }

        const contentType = req.headers['content-type']
        if (contentType.indexOf('application/json') === 0) {
            // Get values from the body
            const { values } = req.body;
            property.values = values
            return saveValuesAndRespond(property, res, next)
        } else if (contentType.indexOf('multipart/form-data') === 0) {
            // Look for data in a CSV file
            return PropertyController.uploadDataFile(property, req, res, next)
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
        } catch (error) {
            next(error)
        }
    };

    static countDataPoints = async (req: Request, res: Response, next: NextFunction) => {
        // Get the property ID from the url
        const thingId = req.params.thingId;
        const propertyId = req.params.propertyId;
        const from = req.query.from as string;
        const timeInterval = req.query.timeInterval as string;
        // Call the Service
        try {
            const result = await PropertyController.propertyService.countDataPoints(thingId, propertyId, undefined, from, timeInterval)
            res.status(200).send(result);
        } catch (error) {
            next(error)
        }
    };

    static uploadDataFile(property: Property, request, response, next) {
        Log.debug("upload data file")
        const hasLabel = request.query.hasLabel === 'true'
        const form = new multiparty.Form()
        let dataStr = ''
        // listen on part event for data file
        form.on('part', part => {
            if (!part.filename) {
                return
            }
            part.on('data', buf => {
                dataStr += buf.toString()
            })
        })
        form.on('close', () => {
            property.values = csvStrToValueArray(property.type.dimensions, dataStr, hasLabel)
            // Log.debug(property.values)
            saveValuesAndRespond(property, response, next)
        })
        form.on('error', next)
        form.parse(request)
    }

    static lastDataPoints = async (req: Request, res: Response, next: NextFunction) => {
        // Get the property ID from the url
        const thingId = req.params.thingId;
        const propertyId = req.params.propertyId;
        // Call the Service
        try {
            const result = await PropertyController.propertyService.lastDataPoints(thingId, propertyId)
            res.status(200).send(result);
        } catch (error) {
            next(error)
        }
    };

    static toCSV(property: Property) {
        let csv = 'time'
        for (let i = 0; i < property.type.dimensions.length; i++) {
            csv += ',' + property.type.dimensions[i].name
        }
        csv += '\n'
        for (let i = 0; i < property.values.length; i++) {
            csv += property.values[i].join(',')
            csv += '\n'
        }
        return csv
    }

    static grantConsent = async (req: Request, res: Response, next: NextFunction) => {
        // Get the property ID from the url
        const thingId = req.params.thingId;
        const propertyId = req.params.propertyId;
        const body = req.body;
        const id = uuidv4()
        const acp = {
            subjects: body.subjects,
            actions: body.actions,
            resources: [propertyId],
            effect: 'allow',
            id: id
        }
        Log.debug("granting: " + JSON.stringify(acp))
        // Call the Service
        try {
            const result = await AuthController.policyService.updateKetoPolicy(acp, 'exact')
            res.status(201).send(result);
        } catch (error) {
            next(error)
        }
    };

    static revokeConsent = async (req: Request, res: Response, next: NextFunction) => {
        // Get the property ID from the url
        const consentId = req.params.consentId;
        // Call the Service
        try {
            await AuthController.policyService.deleteKetoPolicy(consentId, 'exact')
            // After all send a 204 (no content, but accepted) response
            res.status(204).send();
        } catch (error) {
            next(error)
        }
    };

    static listConsents = async (req: Request, res: Response, next: NextFunction) => {
        // Get the property ID from the url
        const propertyId = req.params.propertyId;
        const resource = propertyId
        // Call the Service
        try {
            const consents = await AuthController.policyService.listConsents('resource', resource)
            // After all send a 200 (no content, but accepted) response
            res.status(200).send(consents);
        } catch (error) {
            next(error)
        }
    };
};

export default PropertyController;

/**
 * @param property
 * @param csvStr
 * @returns {{id: *, values: Array}}
 */
function csvStrToValueArray(dimensions: Dimension[], csvStr: string, hasLabel: boolean) {
    const values = []
    let first = true;
    csvStr.split('\n').forEach(line => {
        if ((!first || !hasLabel) && line !== '') {
            const val: any[] = line.split(',')
            val[0] = Number(val[0])
            for (let i = 1; i < val.length; i++) {
                switch (dimensions[i - 1].type) {
                    case 'number': val[i] = Number(val[i]);
                        break;
                    case 'boolean': val[i] = Boolean(val[i]);
                        break;
                    default: // string, keep as it is
                }
            }
            values.push(val)
        }
        if (first) {
            first = false
        }
    })
    return values
}

async function saveValuesAndRespond(property: Property, res: Response, next: NextFunction) {
    // Try to save
    try {
        const result = await PropertyController.propertyService.updatePropertyValues(property)
        return res.json()
    } catch (error) {
        Log.error(error)
        return next(new DCDError(500, "Failed updating property values"))
    }
}