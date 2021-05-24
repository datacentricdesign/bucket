import { Response, NextFunction } from "express";
import { validate } from "class-validator";

import { Property } from "./Property";
import { v4 as uuidv4 } from "uuid";

import * as multiparty from "multiparty";

import { PropertyService } from "./PropertyService";

import { ValueOptions, DTOProperty, DCDError } from "@datacentricdesign/types";
import { AuthController } from "../http/AuthController";
import { Dimension } from "./dimension/Dimension";
import { Log } from "../../Logger";
import { DCDRequest } from "../../config";
import { ThingService } from "../services/ThingService";

export class PropertyController {
  private propertyService: PropertyService;
  private thingService: ThingService;

  constructor() {
    PropertyService.getInstance(this).then(
      (service) => (this.propertyService = service)
    );
    this.thingService = ThingService.getInstance();
  }

  public async getProperties(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // The subject is the targeted thing or the logged in entity
    const subject: string = req.params.thingId
      ? req.params.thingId
      : req.context.userId;
    // The actor is the logged in entity (from the request context)
    const actor: string = req.context.userId;

    // optional query params
    const sharedWith: string = req.query.sharedWith as string;
    const from = parseInt(req.query.from as string);
    const timeInterval = req.query.timeInterval as string;

    // Get properties from Service
    try {
      if (sharedWith !== undefined) {
        // We look for a property SHARED WITH the logged in entity
        const properties: Property[] = await this.propertyService.getProperties(
          subject,
          sharedWith,
          from,
          timeInterval
        );
        res.send(JSON.stringify({ properties: properties }));
      } else if (actor === subject) {
        // We look for a property OWNED with the logged in entity
        const properties: Property[] = await this.propertyService.getPropertiesOfAThing(
          subject
        );
        // Send the things object
        res.send(JSON.stringify({ properties: properties }));
      } else {
        next(new DCDError(403, "Not permitted"));
      }
    } catch (error) {
      if (error.errorCode !== 500) {
        next(error);
      } else {
        next(new DCDError(404, error));
      }
    }
  }

  public async createNewProperty(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Get thing id from the params
    const thingId = req.params.thingId;
    // Get DTO proprety from the body
    const { name, description, typeId } = req.body;
    const dtoProperty: DTOProperty = {
      name: name,
      description: description,
      typeId: typeId,
    };

    try {
      // Validade if the parameters are ok
      const errors = await validate(dtoProperty);
      if (errors.length > 0) {
        throw new DCDError(400, errors.toString());
      }
      // Retrieve thing details from thingId
      const thing = await this.thingService.getOneThingById(thingId);
      if (thing === undefined) {
        throw new DCDError(404, "Thing not found.");
      }
      const createdProperty = await this.propertyService.createNewProperty(
        thing,
        dtoProperty
      );
      // If all ok, send 201 response
      res.status(201).send(JSON.stringify(createdProperty));
    } catch (error) {
      next(error);
    }
  }

  public async getOnePropertyById(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Get the ID from the url
    const thingId: string = req.params.thingId;
    const propertyId = req.params.propertyId;
    const options = this.parseValueOptions(req);

    // Get the Property from the Service
    const property: Property = await this.propertyService.getOnePropertyById(
      thingId,
      propertyId,
      options
    );

    // Double-check the property is actually part of this thing
    if (property === undefined) {
      // If not found, send a 404 response
      return next(new DCDError(404, "Property not found in the thing."));
    }

    if (req.accepts("text/csv")) {
      res.set({ "Content-Type": "text/csv" });
      res.send(this.toCSV(property));
    } else {
      res.send(JSON.stringify(property));
    }
  }

  public async editProperty(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Get the ID from the url
    const thingId = req.params.thingId;
    const propertyId = req.params.propertyId;
    // Get values from the body
    const { name, description } = req.body;
    const property: Property = await this.propertyService.getOnePropertyById(
      thingId,
      propertyId
    );
    if (property === undefined) {
      // If not found, send a 404 response
      return next(new DCDError(404, "Property not found"));
    }

    // Validate the new name/description on model
    property.name = name;
    property.description = description;
    const errors = await validate(property);
    if (errors.length > 0) {
      return next(new DCDError(400, errors.toString()));
    }

    // Try to save
    try {
      await this.propertyService.editOneProperty(property);
    } catch (e) {
      return next(new DCDError(500, "failed updating property"));
    }
    // After all send a 204 (no content, but accepted) response
    res.status(204).send();
  }

  public async updatePropertyValues(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    Log.debug("update property values");
    // Get the ID from the url
    const thingId = req.params.thingId;
    const propertyId = req.params.propertyId;
    const property: Property = await this.propertyService.getOnePropertyById(
      thingId,
      propertyId
    );

    // Double-check the property is actually part of this thing
    if (property === undefined) {
      // If not found, send a 404 response
      return next(new DCDError(404, "Property not found in the thing."));
    }

    const contentType = req.headers["content-type"];
    if (contentType.indexOf("application/json") === 0) {
      // Get values from the body
      const { values } = req.body;
      property.values = values;
      this.saveValuesAndRespond(property, res, next);
    } else if (contentType.indexOf("multipart/form-data") === 0) {
      // Look for data in a CSV file
      this.uploadDataFile(property, req, res, next);
    }
  }

  public async deleteOneProperty(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Get the property ID from the url
    const thingId = req.params.thingId;
    const propertyId = req.params.propertyId;
    // Call the Service
    try {
      await this.propertyService.deleteOneProperty(thingId, propertyId);
      // After all send a 204 (no content, but accepted) response
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Returns a property object with 1 row of values for each
   * time interval, representing the count for each dimension.
   */
  public async countDataPoints(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Get the property ID from the url
    const thingId = req.params.thingId;
    const propertyId = req.params.propertyId;
    const from = parseInt(req.query.from as string);
    const timeInterval = req.query.timeInterval as string;
    // Call the Service
    try {
      const property = await this.propertyService.getOnePropertyById(
        thingId,
        propertyId,
        {
          from: from,
          to: Date.now(),
          timeInterval: timeInterval,
          fctInterval: "count",
          fill: undefined,
        }
      );

      res.status(200).send(JSON.stringify(property));
    } catch (error) {
      next(error);
    }
  }

  public async lastDataPoints(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Get the property ID from the url
    const thingId = req.params.thingId;
    const propertyId = req.params.propertyId;
    // Call the Service
    try {
      const property = await this.propertyService.getOnePropertyById(
        thingId,
        propertyId,
        {
          from: 0,
          to: Date.now(),
          timeInterval: undefined,
          fctInterval: "last",
          fill: undefined,
        }
      );
      res.status(200).send(property);
    } catch (error) {
      next(error);
    }
  }

  public async grantConsent(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Get the property ID from the url
    const propertyId = req.params.propertyId;
    const body = req.body;
    const id = uuidv4();
    const acp = {
      subjects: body.subjects,
      actions: body.actions,
      resources: [propertyId],
      effect: "allow",
      id: id,
    };
    Log.debug("granting: " + JSON.stringify(acp));
    // Call the Service
    try {
      const result = await AuthController.policyService.updateKetoPolicy(
        acp,
        "exact"
      );
      res.status(201).send(result);
    } catch (error) {
      next(error);
    }
  }

  public async revokeConsent(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Get the property ID from the url
    const consentId = req.params.consentId;
    // Call the Service
    try {
      await AuthController.policyService.deleteKetoPolicy(consentId, "exact");
      // After all send a 204 (no content, but accepted) response
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  public async listConsents(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Get the property ID from the url
    const propertyId = req.params.propertyId;
    const resource = propertyId;
    // Call the Service
    try {
      const consents = await AuthController.policyService.listConsents(
        "resource",
        resource
      );
      // After all send a 200 (no content, but accepted) response
      res.status(200).send(consents);
    } catch (error) {
      next(error);
    }
  }

  private parseValueOptions(req: DCDRequest): ValueOptions {
    if (req.query.from === undefined || req.query.to === undefined) {
      return undefined;
    }
    return {
      from: Number.parseInt(req.query.from + ""),
      to: Number.parseInt(req.query.to + ""),
      timeInterval:
        req.query.timeInterval !== undefined
          ? req.query.timeInterval + ""
          : undefined,
      fctInterval:
        req.query.fctInterval !== undefined
          ? req.query.fctInterval + ""
          : undefined,
      fill: req.query.fill !== undefined ? req.query.fill + "" : "none",
    };
  }

  private uploadDataFile(
    property: Property,
    request: DCDRequest,
    response: Response,
    next: NextFunction
  ): void {
    Log.debug("upload data file");
    const hasLabel = request.query.hasLabel === "true";
    const form = new multiparty.Form();
    let dataStr = "";
    // listen on part event for data file
    form.on("part", (part) => {
      if (!part.filename) {
        return;
      }
      part.on("data", (buf) => {
        dataStr += buf.toString();
      });
    });
    form.on("close", () => {
      property.values = this.csvStrToValueArray(
        property.type.dimensions,
        dataStr,
        hasLabel
      );
      // Log.debug(property.values)
      this.saveValuesAndRespond(property, response, next);
    });
    form.on("error", next);
    form.parse(request);
  }

  private async saveValuesAndRespond(
    property: Property,
    res: Response,
    next: NextFunction
  ) {
    // Try to save
    try {
      await this.propertyService.updatePropertyValues(property);
      return res.json();
    } catch (error) {
      Log.error(error);
      return next(new DCDError(500, "Failed updating property values"));
    }
  }

  /**
   * Convert values of a property into a CSV.
   */
  private toCSV(property: Property): string {
    let csv = "time";
    for (let i = 0; i < property.type.dimensions.length; i++) {
      csv += "," + property.type.dimensions[i].name;
    }
    csv += "\n";
    for (let i = 0; i < property.values.length; i++) {
      csv += property.values[i].join(",");
      csv += "\n";
    }
    return csv;
  }

  /**
   * Convert values of a CSV string into a 2D array (property values).
   * @returns {{id: *, values: Array}}
   */
  private csvStrToValueArray(
    dimensions: Dimension[],
    csvStr: string,
    hasLabel: boolean
  ): string[][] | number[][] {
    const values = [];
    let first = true;
    csvStr.split("\n").forEach((line) => {
      if ((!first || !hasLabel) && line !== "") {
        try {
          const val: Array<string | number> = line.split(",");
          val[0] = Number(val[0]);
          for (let i = 1; i < val.length; i++) {
            if (dimensions[i - 1].type === "number") {
              val[i] = Number(val[i]);
            }
          }
          values.push(val);
        } catch (error) {
          Log.error(error);
        }
      }
      if (first) {
        first = false;
      }
    });
    return values;
  }
}
