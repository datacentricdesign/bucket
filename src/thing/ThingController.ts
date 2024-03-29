import { Response, NextFunction } from "express";
import { validate } from "class-validator";

import { Thing } from "./Thing";
import { ThingService } from "./ThingService";
import { DCDError } from "@datacentricdesign/types";
import { DCDRequest } from "../config";
import { DPiService } from "./dpi/DPiService";
import { Log } from "../Logger";

export class ThingController {
  private static instance: ThingController;

  public static getInstance(): ThingController {
    if (ThingController.instance === undefined) {
      ThingController.instance = new ThingController();
    }
    return ThingController.instance;
  }

  private thingService: ThingService;
  private dpiService: DPiService;

  private constructor() {
    this.thingService = ThingService.getInstance();
    this.dpiService = DPiService.getInstance();
  }

  /**
   * Return a status 'OK', a way to check that the API is up and running.
   */
  public async getAPIHealth(req: DCDRequest, res: Response): Promise<void> {
    res.send({ status: "OK" });
  }

  public async getThingsOfAPerson(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Get things from Service
    try {
      const things: Thing[] = await this.thingService.getThingsOfAPerson(
        req.context.userId
      );

      // Send the things object
      res.send(things);
    } catch (error) {
      return next(error);
    }
  }

  public async getOneThingById(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Get the ID from the url
    const thingId: string = req.params.thingId;
    try {
      // Get the Thing from the Service
      const thing: Thing = await this.thingService.getOneThingById(thingId);
      res.send(thing);
    } catch (error) {
      return next(new DCDError(404, "Thing not found"));
    }
  }

  public async createNewThing(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Get parameters from the body
    const { name, description, type, pem, dpi } = req.body;

    // Generate a new ID
    const thingToCreate = new Thing();
    thingToCreate.id = this.thingService.generateThingID();
    // A Thing must have a name
    if (name === undefined || name === "") {
      return next(new DCDError(4003, "Add field name."));
    }
    thingToCreate.name = name;
    // A Thing must have a type
    if (type === undefined || type === "") {
      return next(new DCDError(4003, "Add field type."));
    }
    thingToCreate.type = type;
    // A Thing might have a description
    if (description === undefined) {
      thingToCreate.description = description;
    }

    // Get thing creator identity from the request context
    thingToCreate.personId = req.context.userId;

    try {
      const createdThing = await this.thingService.createNewThing(
        thingToCreate
      );
      if (pem !== undefined && typeof pem === "string") {
        pem.trim();
        const error = checkPEM(pem);
        if (error !== undefined) return next(error);
        await this.thingService.editThingPEM(createdThing.id, pem);
      }

      if (createdThing.type === "RASPBERRYPI" && dpi !== undefined) {
        await this.dpiService.generateDPiImage(dpi, createdThing.id);
      }

      // If all ok, send 201 response
      res.status(201).send(createdThing);
    } catch (error) {
      return next(error);
    }
  }

  public async editThing(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Get the ID from the url
    const thingId = req.params.thingId;
    // Get values from the body
    const { name, description } = req.body;
    let thing: Thing;
    try {
      thing = await this.thingService.getOneThingById(thingId);
    } catch (error) {
      // If not found, send a 404 response
      return next(new DCDError(404, "Thing not found"));
    }

    // Validate the new values on model
    thing.name = name;
    thing.description = description;
    const errors = await validate(thing);
    if (errors.length > 0) {
      return next(new DCDError(400, errors.toString()));
    }

    // Try to save
    try {
      await this.thingService.editOneThing(thing);
    } catch (error) {
      return next(new DCDError(500, "Failed to update thing"));
    }
    //After all send a 204 (no content, but accepted) response
    res.status(204).send();
  }

  public async editThingPEM(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Get the thing ID from the url
    const thingId = req.params.thingId;
    // Get pem from body
    const pem = req.body.pem;
    if (pem !== undefined && typeof pem !== "string") {
      return next(new DCDError(400, "Missing PEM key."));
    }
    pem.trim();
    const error = checkPEM(pem);
    if (error !== undefined) return next(error);
    // Call the Service
    this.thingService
      .editThingPEM(thingId, pem)
      .then(() => {
        res.status(204).send();
      })
      .catch((error) => {
        next(error);
      });
  }

  public async deleteOneThing(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Get the thing ID from the url
    const thingId = req.params.thingId;
    // Call the Service
    try {
      await this.thingService.deleteOneThing(thingId);
      // After all send a 204 (no content, but accepted) response
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  public async countDataPoints(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Get the property ID from the url
    const from = req.query.from as string;
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

  public async generateTakeOut(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await this.thingService.generateTakeOut(req.context.userId);
      await new Promise<void>((resolve, reject) => {
        result.pipe(res);
        result.on("error", (error) => {
          reject(error);
        });
        res.on("finish", function () {
          resolve();
        });
      });
    } catch (error) {
      next(error);
    }
  }

}

function checkPEM(pem: string): DCDError {
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
