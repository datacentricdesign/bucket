import { Response, NextFunction } from "express";
import { validate } from "class-validator";

import { DCDError } from "@datacentricdesign/types";
import Thing from "../Thing";
import { ThingService } from "../services/ThingService";
import { DCDRequest } from "../../config";
import { DPiService } from "../dpi/DPiService";

class ThingController {
  private thingService: ThingService;

  private dpiService: DPiService;

  constructor() {
    this.thingService = ThingService.getInstance();
    this.dpiService = DPiService.getInstance();
  }

  static async apiHealth(req: DCDRequest, res: Response): Promise<void> {
    res.send({ status: "OK" });
  }

  static async getThingsOfAPerson(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Get things from Service
    try {
      const things: Thing[] = await ThingService.getThingsOfAPerson(
        req.context.userId
      );
      // Send the things object
      res.send(things);
    } catch (error) {
      next(error);
    }
  }

  static async getOneThingById(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Get the ID from the url
    const { thingId } = req.params;
    try {
      // Get the Thing from the Service
      const thing: Thing = await ThingService.getOneThingById(thingId);
      res.send(thing);
    } catch (error) {
      next(new DCDError(404, "Thing not found"));
    }
  }

  async createNewThing(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Get parameters from the body
    const { name, description, type, pem, dpi } = req.body;
    const thing = new Thing();
    thing.name = name;
    thing.description = description;
    thing.type = type;

    // Get thing creator identity from the request context
    thing.personId = req.context.userId;

    // Validade if the parameters are ok
    const errors = await validate(thing);
    if (errors.length > 0) {
      next(new DCDError(400, errors.toString()));
    } else {
      try {
        const createdThing = await this.thingService.createNewThing(thing);
        if (pem !== undefined && typeof pem === "string") {
          pem.trim();
          const error = ThingController.checkPEM(pem);
          if (error !== undefined) return next(error);
          await this.thingService.editThingPEM(thing.id, pem);
        }

        if (thing.type === "RASPBERRYPI" && dpi !== undefined) {
          await this.dpiService.generateDPiImage(dpi, thing);
        }

        // If all ok, send 201 response
        res.status(201).send(createdThing);
      } catch (error) {
        next(error);
      }
    }
  }

  static async editThing(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Get the ID from the url
    const { thingId } = req.params;
    // Get values from the body
    const { name, description } = req.body;
    let thing: Thing;
    try {
      thing = await ThingService.getOneThingById(thingId);
      // Validate the new values on model
      thing.name = name;
      thing.description = description;
      const errors = await validate(thing);
      if (errors.length > 0) {
        next(new DCDError(400, errors.toString()));
      } else {
        // Try to save
        try {
          await ThingService.editOneThing(thing);
          // After all send a 204 (no content, but accepted) response
          res.status(204).send();
        } catch (error) {
          next(new DCDError(500, "Failed to update thing"));
        }
      }
    } catch (error) {
      // If not found, send a 404 response
      next(new DCDError(404, "Thing not found"));
    }
  }

  async editThingPEM(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Get the thing ID from the url
    const { thingId } = req.params;
    // Get pem from body
    const { pem } = req.body;
    if (pem !== undefined && typeof pem !== "string") {
      next(new DCDError(400, "Missing PEM key."));
    } else {
      pem.trim();
      const errorPEM = ThingController.checkPEM(pem);
      if (errorPEM !== undefined) {
        next(errorPEM);
      } else {
        // Call the Service
        try {
          await this.thingService.editThingPEM(thingId, pem);
          res.status(204).send();
        } catch (error) {
          next(error);
        }
      }
    }
  }

  static async deleteOneThing(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Get the thing ID from the url
    const { thingId } = req.params;
    // Call the Service
    try {
      await ThingService.deleteOneThing(thingId);
      // After all send a 204 (no content, but accepted) response
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async countDataPoints(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Get the property ID from the url
    const from = parseInt(req.query.from as string, 10);
    const timeInterval = req.query.timeInterval as string;

    // Call the Service
    try {
      const result = await this.thingService.countDataPoints(
        req.context.userId,
        from,
        timeInterval
      );
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  }

  private static checkPEM(pem: string): DCDError {
    if (pem === undefined) {
      return new DCDError(
        400,
        'The public key should be provided in the body parameter "pem".'
      );
    }
    if (
      !pem.startsWith("-----BEGIN PUBLIC KEY-----") ||
      !pem.endsWith("-----END PUBLIC KEY-----")
    ) {
      return new DCDError(
        400,
        'The public key should start with "-----BEGIN PUBLIC KEY-----" and ends with "-----END PUBLIC KEY-----"'
      );
    }
  }
}

export default ThingController;
