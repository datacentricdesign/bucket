import { Request, Response, NextFunction } from "express";

import { PropertyType } from "./PropertyType";
import { PropertyTypeService } from "./PropertyTypeService";
import { Dimension } from "../dimension/Dimension";

export class PropertyTypeController {
  static propertyTypeService = new PropertyTypeService();

  static getPropertyTypes = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    // Get things from Service
    try {
      const propertyTypes: PropertyType[] =
        await PropertyTypeController.propertyTypeService.getPropertyTypes();
      // Send the things object
      res.send(propertyTypes);
    } catch (error) {
      res.status(404).send(error);
    }
  };

  static getOnePropertyTypeById = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    // Get the ID from the url
    const propertyTypeId = req.params.propertyTypeId;
    try {
      // Get the Property Type from the Service
      const propertyType: PropertyType =
        await PropertyTypeController.propertyTypeService.getOnePropertyTypeById(
          propertyTypeId
        );
      res.send(propertyType);
    } catch (error) {
      res.status(404).send("Thing not found");
    }
  };

  static createOnePropertyType = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { id, name, description, dimensions } = req.body;
    const propertyType = new PropertyType();
    propertyType.id = id;
    propertyType.name = name;
    propertyType.description = description;

    propertyType.dimensions = [];
    for (let i = 0; i < dimensions.length; i++) {
      const dim: Dimension = new Dimension();
      dim.id = dimensions[i].id;
      dim.name = dimensions[i].name;
      dim.description = dimensions[i].description;
      dim.unit = dimensions[i].unit;
      dim.type = dimensions[i].type;
      propertyType.dimensions.push(dim);
    }

    try {
      await PropertyTypeController.propertyTypeService.createOnePropertyType(
        propertyType
      );
      res.send(propertyType);
    } catch (error) {
      next(error);
    }
  };

  static deleteOnePropertyTypeById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Get the thing ID from the url
    const propertyTypeId = req.params.propertyTypeId;
    // Call the Service
    try {
      await PropertyTypeController.propertyTypeService.deleteOnePropertyTypeById(
        propertyTypeId
      );
      // After all send a 204 (no content, but accepted) response
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}

export default PropertyTypeController;
