import { Request, Response, NextFunction } from "express";
import { validate } from "class-validator";

import { Property } from "./Property";
import { v4 as uuidv4 } from "uuid";

import * as fs from "fs";

import { PropertyService } from "./PropertyService";

import { ValueOptions, DTOProperty, DCDError } from "@datacentricdesign/types";
import { AuthController } from "../http/AuthController";
import { Dimension } from "./dimension/Dimension";
import { Log } from "../../Logger";
import config, { DCDRequest } from "../../config";

import * as ws from "ws";
import { WebRtcConnectionManager } from "./webrtc/WebRTCConnectionManager";
import { AccessControlPolicy } from "../services/PolicyService";

function streamToString(stream): Promise<string> {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", (err) => reject(err));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

export class PropertyController {
  static propertyService = new PropertyService();
  static connectionManager = new WebRtcConnectionManager();

  static parseValueOptions(req: Request): ValueOptions {
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

  static getProperties = async (
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const sharedWith: string = req.query.sharedWith as string;
    const subject: string = req.params.thingId
      ? req.params.thingId
      : req.context.userId;
    const actor: string = req.context.userId;

    // optionals
    const from = req.query.from as string;
    const timeInterval = req.query.timeInterval as string;

    // Get properties from Service
    try {
      if (sharedWith !== undefined) {
        const properties: Property[] =
          await PropertyController.propertyService.getProperties(
            actor,
            subject,
            sharedWith,
            from,
            timeInterval
          );
        res.send(properties);
      } else if (actor == subject) {
        const properties: Property[] =
          await PropertyController.propertyService.getPropertiesOfAThing(
            subject
          );
        // Send the things object
        res.send(properties);
      }
    } catch (error) {
      if (error.errorCode !== 500) {
        next(error);
      } else {
        next(new DCDError(404, error));
      }
    }
  };

  static getOnePropertyById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Get the ID from the url
    const thingId: string = req.params.thingId;
    const propertyId = req.params.propertyId;
    const options = PropertyController.parseValueOptions(req);

    // Get the Property from the Service
    const property: Property =
      await PropertyController.propertyService.getOnePropertyById(
        thingId,
        propertyId,
        options
      );

    if (req.accepts("application/json")) {
      res.send(property);
    } else if (req.accepts("text/csv")) {
      res.set({ "Content-Type": "text/csv" });
      res.send(PropertyController.toCSV(property));
    } else {
      // Double-check the property is actually part of this thing
      if (property === undefined) {
        // If not found, send a 404 response
        next(new DCDError(404, "Property not found in the thing."));
      } else {
        res.send(property);
      }
    }
  };

  static createNewProperty = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Get parameters from the body
    const { name, description, typeId } = req.body;
    const property: DTOProperty = {};
    property.name = name;
    property.description = description;
    property.typeId = typeId;

    // Validade if the parameters are ok
    const errors = await validate(property);
    if (errors.length > 0) {
      return next(new DCDError(400, errors.toString()));
    }

    try {
      const createdProperty =
        await PropertyController.propertyService.createNewProperty(
          req.params.thingId,
          property
        );
      // If all ok, send 201 response
      res.status(201).send(createdProperty);
    } catch (error) {
      next(error);
    }
  };

  static streamMedia = async (
    ws: ws,
    req: Request,
    next: NextFunction
  ): Promise<void> => {
    // Retrieve property
    const thingId = req.params.thingId;
    const propertyId = req.params.propertyId;
    const property: Property =
      await PropertyController.propertyService.getOnePropertyById(
        thingId,
        propertyId
      );
    if (property === undefined) {
      return next(new DCDError(404, "Property not found."));
    }
    ws.on("message", async (message: Buffer) => {
      let connection = null;
      const messageJson = JSON.parse(message.toString());
      switch (messageJson.type) {
        case "new":
          // TODO get video property to record on
          try {
            connection =
              await PropertyController.connectionManager.createConnection(
                property
              );
            ws.send(JSON.stringify(connection));
          } catch (error) {
            console.error(error);
            ws.send(JSON.stringify(error));
          }
          break;
        case "leave":
          Log.debug("leaving: " + messageJson.id);
          connection = PropertyController.connectionManager.getConnection(
            messageJson.id
          );
          Log.debug(connection);
          if (!connection) {
            ws.send("Connection not found");
            return;
          }
          connection.close();
          ws.send(JSON.stringify(connection));
          break;
        case "answer":
          Log.debug("answer type for " + messageJson.id);
          connection = PropertyController.connectionManager.getConnection(
            messageJson.id
          );
          if (!connection) {
            ws.send("Connection not found");
            return;
          }
          try {
            await connection.applyAnswer(messageJson.localDescription);
            ws.send(JSON.stringify(connection.toJSON().remoteDescription));
          } catch (error) {
            ws.send(JSON.stringify(error));
          }
          break;
        default:
          Log.debug(messageJson);
          break;
      }
    });
  };

  static editProperty = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Get the ID from the url
    const thingId = req.params.thingId;
    const propertyId = req.params.propertyId;
    // Get values from the body
    const { name, description } = req.body;
    const property: Property =
      await PropertyController.propertyService.getOnePropertyById(
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
      await PropertyController.propertyService.editOneProperty(property);
    } catch (e) {
      return next(new DCDError(500, "failed updating property"));
    }
    // After all send a 204 (no content, but accepted) response
    res.status(204).send();
  };

  static getPropertyMediaValue = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Get the ID from the url
    const thingId = req.params.thingId;
    const propertyId = req.params.propertyId;
    const timestamp = Number.parseInt(req.params.timestamp);
    const dimension = req.params.dimensionId;
    const property: Property =
      await PropertyController.propertyService.getOnePropertyById(
        thingId,
        propertyId
      );
    if (property === undefined) {
      return next(new DCDError(404, "Property not found."));
    }
    let extension = null;
    for (let i = 0; i < property.type.dimensions.length; i++) {
      if (property.type.dimensions[i].id === dimension) {
        extension = property.type.dimensions[i].unit;
      }
    }
    if (extension === null) {
      return next(new DCDError(404, "Dimension not found: " + dimension));
    }
    const path =
      config.hostDataFolder +
      "/files/" +
      thingId +
      "-" +
      propertyId +
      "-" +
      timestamp +
      "#" +
      dimension +
      extension;
    res.download(path, function (error) {
      if (error) {
        Log.error(
          "Failed to serve property media " + path + " Error: " + error
        );
        return next(
          new DCDError(404, "Media not found for this timestamp: " + timestamp)
        );
      } else {
        Log.info("Served property media " + path);
      }
    });
  };

  static updatePropertyValues = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    Log.debug("update property values");
    // Get the ID from the url
    const thingId = req.params.thingId;
    const propertyId = req.params.propertyId;

    const contentType = req.headers["content-type"];

    const property: Property =
      await PropertyController.propertyService.getOnePropertyById(
        thingId,
        propertyId
      );

    // Double-check the property is actually part of this thing
    if (property === undefined) {
      // If not found, send a 404 response
      return next(new DCDError(404, "Property not found in the thing."));
    }

    if (contentType.indexOf("application/json") === 0) {
      // Get values from the body
      const { values } = req.body;
      property.values = values;
      saveValuesAndRespond(property, res, next);
    } else if (contentType.indexOf("multipart/form-data") === 0) {
      Log.debug("values with file");
      Log.debug(req.body.property);
      if (req.body.property !== undefined) {
        const body = JSON.parse(req.body.property);
        // there are values,
        const timestamp = body.values[0][0];

        // check if missing files (dimension with no value)
        const completeValues = [timestamp];
        let indexValues = 1;
        for (let i = 0; i < property.type.dimensions.length; i++) {
          // if type is a mime type (includes a slash)
          if (property.type.dimensions[i].type.split("/").length > 1) {
            // Then there must be a received file for this dimension
            let fileExist = false;
            for (let j = 0; j < req.files.length; j++) {
              if (property.type.dimensions[i].id === req.files[j].fieldname) {
                fileExist = true;
                completeValues.push(req.files[j].filename);
              }
            }
            if (!fileExist) {
              return next(
                new DCDError(
                  400,
                  "Dimension " +
                    property.type.dimensions[i].id +
                    " has no file."
                )
              );
            }
          } else {
            completeValues.push(body.values[0][indexValues]);
            indexValues++;
          }
        }
        Log.debug(completeValues);
        property.values = [completeValues];
        saveValuesAndRespond(property, res, next);
      } else {
        // there is no value, this should be in a CSV file
        const hasLabel = req.query.hasLabel === "true";
        // Load in
        Log.debug("array files");
        Log.debug(req.files);
        const stream = fs.createReadStream(req.files[0].path, "utf8");
        const dataStr = await streamToString(stream);
        // delete CSV file
        fs.unlink(req.files[0].path, (err) => {
          if (err) {
            Log.error("CSV file could not be deleted.");
            return next(new DCDError(500, "Error with the csv file."));
          }
          Log.debug("File is deleted.");
          return res.status(201).send();
        });
        property.values = csvStrToValueArray(
          property.type.dimensions,
          dataStr,
          hasLabel
        );
        // Log.debug(property.values)
        saveValuesAndRespond(property, res, next);
      }
    }
  };

  static deleteOneProperty = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Get the property ID from the url
    const thingId = req.params.thingId;
    const propertyId = req.params.propertyId;
    // Call the Service
    try {
      await PropertyController.propertyService.deleteOneProperty(
        thingId,
        propertyId
      );
      // After all send a 204 (no content, but accepted) response
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  static countDataPoints = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Get the property ID from the url
    const thingId = req.params.thingId;
    const propertyId = req.params.propertyId;
    const from = req.query.from as string;
    const timeInterval = req.query.timeInterval as string;
    // Call the Service
    try {
      const result = await PropertyController.propertyService.countDataPoints(
        thingId,
        propertyId,
        undefined,
        from,
        timeInterval
      );
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  static lastDataPoints = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Get the property ID from the url
    const thingId = req.params.thingId;
    const propertyId = req.params.propertyId;
    // Call the Service
    try {
      const result = await PropertyController.propertyService.lastDataPoints(
        thingId,
        propertyId
      );
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  static toCSV(property: Property): string {
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

  static grantConsent = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Get the property ID from the url
    const propertyId = req.params.propertyId;
    const body = req.body;
    const id = uuidv4();
    const acp: AccessControlPolicy = {
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
  };

  static revokeConsent = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
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
  };

  static listConsents = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
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
  };
}

export default PropertyController;

/**
 * @param dimensions
 * @param csvStr
 * @param hasLabel
 * @returns {{id: *, values: Array}}
 */
function csvStrToValueArray(
  dimensions: Dimension[],
  csvStr: string,
  hasLabel: boolean
): (number | string)[][] {
  const values = [];
  let first = true;
  csvStr.split("\n").forEach((line) => {
    if ((!first || !hasLabel) && line !== "") {
      try {
        const val: (string | number | boolean)[] = line.split(",");
        val[0] = Number(val[0]);
        for (let i = 1; i < val.length; i++) {
          switch (dimensions[i - 1].type) {
            case "number":
              val[i] = Number(val[i]);
              break;
            case "boolean":
              val[i] = Boolean(val[i]);
              break;
            default: // string, keep as it is
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

async function saveValuesAndRespond(
  property: Property,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Try to save
  try {
    await PropertyController.propertyService.updatePropertyValues(property);
    res.json();
  } catch (error) {
    Log.error(error);
    if (error._hint !== undefined) {
      return next(error);
    }
    return next(new DCDError(500, "Failed updating property values"));
  }
}
