import { Request, Response, NextFunction } from "express";

import { PropertyType } from "./PropertyType";
import { PropertyTypeService } from "./PropertyTypeService";
import { Dimension } from "../dimension/Dimension";
import { DCDError } from "@datacentricdesign/types";

export class PropertyTypeController {
  private static instance: PropertyTypeController;

  public static getInstance(): PropertyTypeController {
    if (PropertyTypeController.instance === undefined) {
      PropertyTypeController.instance = new PropertyTypeController();
    }
    return PropertyTypeController.instance;
  }

  private propertyTypeService: PropertyTypeService;

  constructor() {
    this.propertyTypeService = PropertyTypeService.getInstance();
  }

  public async getPropertyTypes(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Get things from Service
    try {
      const propertyTypes: PropertyType[] =
        await this.propertyTypeService.getPropertyTypes();
      // Send the things object
      res.send(propertyTypes);
    } catch (error) {
      next(error);
    }
  }

  public async getOnePropertyTypeById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Get the ID from the url
    const propertyTypeId = req.params.propertyTypeId;
    try {
      // Get the Property Type from the Service
      const propertyType: PropertyType =
        await this.propertyTypeService.getOnePropertyTypeById(propertyTypeId);
      res.send(propertyType);
    } catch (error) {
      next(new DCDError(404, "Thing not found"));
    }
  }

  public async createOnePropertyType(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
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
      if (dimensions[i].labels !== undefined) {
        dim.labels = dimensions[i].labels;
      }
      propertyType.dimensions.push(dim);
    }

    try {
      await this.propertyTypeService.createOnePropertyType(propertyType);
      res.send(propertyType);
    } catch (error) {
      next(error);
    }
  }

  public async deleteOnePropertyTypeById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Get the thing ID from the url
    const propertyTypeId = req.params.propertyTypeId;
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

export default PropertyTypeController;
