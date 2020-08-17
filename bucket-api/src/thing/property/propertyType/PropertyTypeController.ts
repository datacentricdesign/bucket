import {Request, Response, Router, NextFunction} from "express";
import {getRepository, DeleteResult} from "typeorm";
import {validate} from "class-validator";

import { ValueOptions, DTOProperty } from "@datacentricdesign/types";
import { PropertyType } from "./PropertyType";
import { PropertyTypeService } from "./PropertyTypeService";

export class PropertyTypeController {

    static propertyTypeService = new PropertyTypeService();

    static getPropertyTypes = async (req: Request, res: Response) => {
        // Get things from Service
        try {
            const propertyTypes: PropertyType[] = await PropertyTypeController.propertyTypeService.getPropertyTypes()
            // Send the things object
            res.send(propertyTypes);
        } catch(error) {
            res.status(404).send(error);
        }
    };

    static getOnePropertyTypeById = async (req: Request, res: Response) => {
        // Get the ID from the url
        const propertyTypeId = req.params.propertyTypeId;
        try {
            // Get the Property Type from the Service
            const propertyType: PropertyType = await PropertyTypeController.propertyTypeService.getOnePropertyTypeById(propertyTypeId)
            res.send(propertyType);
        } catch (error) {
            res.status(404).send("Thing not found");
        }
    };

};

export default PropertyTypeController;
