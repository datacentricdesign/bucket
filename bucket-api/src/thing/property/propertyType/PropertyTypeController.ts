import { NextFunction, Response } from "express";

import { PropertyType } from "./PropertyType";
import { PropertyTypeService } from "./PropertyTypeService";
import { Dimension } from "../dimension/Dimension";
import { DCDRequest } from "../../../config";

export class PropertyTypeController {
  private propertyTypeService: PropertyTypeService;

  constructor() {
    this.propertyTypeService = new PropertyTypeService();
  }

  async getPropertyTypes(req: DCDRequest, res: Response): Promise<void> {
    // Get things from Service
    try {
      const propertyTypes: PropertyType[] = await this.propertyTypeService.getPropertyTypes();
      // Send the things object
      res.send(propertyTypes);
    } catch (error) {
      res.status(404).send(error);
    }
  }

  async getOnePropertyTypeById(req: DCDRequest, res: Response): Promise<void> {
    // Get the ID from the url
    const { propertyTypeId } = req.params;
    try {
      // Get the Property Type from the Service
      const propertyType: PropertyType = await this.propertyTypeService.getOnePropertyTypeById(
        propertyTypeId
      );
      res.send(propertyType);
    } catch (error) {
      res.status(404).send("Thing not found");
    }
  }

  async createOnePropertyType(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { id, name, description, dimensions } = req.body,
      propertyType = new PropertyType();
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
      await this.propertyTypeService.createOnePropertyType(propertyType);
      res.send(propertyType);
    } catch (error) {
      next(error);
    }
  }

  async deleteOnePropertyTypeById(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Get the thing ID from the url
    const { propertyTypeId } = req.params;
    // Call the Service
    try {
      await this.propertyTypeService.deleteOnePropertyTypeById(propertyTypeId);
      // After all send a 204 (no content, but accepted) response
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
