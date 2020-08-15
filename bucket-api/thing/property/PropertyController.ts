import { Request, Response, Router, NextFunction } from "express";
import { getRepository, DeleteResult } from "typeorm";
import { validate } from "class-validator";

import { Property } from "./Property";
import { Thing } from "../Thing";

import { multiparty } from 'multiparty'

import { PropertyService } from "./PropertyService"
import { ThingService } from "../services/ThingService"

import { DCDError } from "@datacentricdesign/types";
import { ValueOptions, DTOProperty } from "@datacentricdesign/types";
import { Dimension } from "./dimension/Dimension";

export class PropertyController {

    static propertyService = new PropertyService();
    static thingService = new ThingService();


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

    static getPropertiesOfAThing = async (req: Request, res: Response) => {
        // Get the ID from the url
        const thingId: string = req.params.thingId;
        // Get things from Service
        try {
            const properties: Property[] = await PropertyController.propertyService.getPropertiesOfAThing(thingId)
            // Send the things object
            res.send(properties);
        } catch (error) {
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
            res.status(404).send("Property not found in the thing.");
            return;
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
        const { name, description } = req.body;
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

    static updatePropertyValues = async (req: Request, res: Response, next: NextFunction) => {
        // Get the ID from the url
        const thingId = req.params.thingId;
        const propertyId = req.params.propertyId;
        let property: Property = await PropertyController.propertyService.getOnePropertyById(thingId, propertyId)

        // Double-check the property is actually part of this thing
        if (property === undefined) {
            // If not found, send a 404 response
            res.status(404).send("Property not found in the thing.");
            return;
        }

        const contentType = req.headers['content-type']
        if (contentType.indexOf('application/json') === 0) {
            // Get values from the body
            const { values } = req.body;
            property.values = values
            saveValuesAndRespond(property, res)
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
            property.values = csvStrToValueArray(property.type.dimensions, dataStr)
            saveValuesAndRespond(property, response)
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
};

export default PropertyController;

/**
 * @param property
 * @param csvStr
 * @returns {{id: *, values: Array}}
 */
function csvStrToValueArray(dimensions: Dimension[], csvStr: string) {
    const values = []
    csvStr.split('\n').forEach(line => {
        if (line !== '') {
            const val: any[] = line.split(',')
            for (let i = 1; i < values.length; i++) {
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
    })
    return values
}

async function saveValuesAndRespond(property: Property, res: Response) {
    // Try to save
    try {
        const result = await PropertyController.propertyService.updatePropertyValues(property)
        res.json(result)
    } catch (e) {
        console.log(e)
        res.status(500).send("failed updating property values");
        return;
    }
}