import { NextFunction, Response } from "express";
import config, { DCDRequest } from "../../config";
import fetch from "node-fetch";
import { DCDError } from "@datacentricdesign/types";
import { DPiService } from "./DPiService";
import { ThingService } from "../services/ThingService";

export class DPiController {
  private dpiService: DPiService;

  private thingService: ThingService;

  constructor() {
    this.dpiService = DPiService.getInstance();
    this.thingService = ThingService.getInstance();
  }

  async healthStatus(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const url = `${config.env.dpiUrl}/health`,
      options = {
        method: "GET",
      };
    try {
      const result = await fetch(url, options),
        json = await result.json();
      res.status(200).send(json);
    } catch (error) {
      const dcdError = new DCDError(503, "Service not available.");
      dcdError._statusCode = 503;
      return next(dcdError);
    }
  }

  async getOneDPIImage(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const url = `${config.env.dpiUrl}/${req.params.thingId.replace(
        "dcd:things:",
        ""
      )}`,
      { thingId } = req.params,
      options = {
        method: "GET",
      };
    try {
      const result = await fetch(url, options),
        json = await result.json();
      if (json.errorCode !== undefined) {
        res.status(json.errorCode).json(json);
        const dcdError = new DCDError(json.errorCode, json);
        dcdError._statusCode = json.errorCode;
        return next(dcdError);
      } else if (json.code === 0 && req.query.download === "true") {
        const dpiId = thingId.replace("dcd:things:", ""),
          downloadURL = `${config.env.dpiUrl}/${dpiId}?download=true`,
          result = await fetch(downloadURL);
        await new Promise((resolve, reject) => {
          result.body.pipe(res);
          result.body.on("error", (error) => {
            reject(error);
          });
          res.on("finish", function () {
            resolve({});
          });
        });
      } else {
        res.status(200).json(json);
      }
    } catch (error) {
      if (error.errorCode === 404) {
        return next(new DCDError(404, error));
      }
      return next(error);
    }
  }

  async generateNewDPIImage(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Retrieve thing details from thingId
      const thing = await this.thingService.getOneThingById(req.params.thingId),
        text = await this.dpiService.generateDPiImage(req.body, thing);
      res.send(text);
    } catch (error) {
      return next(error);
    }
  }

  async cancelDPiImageGeneration(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const url = `${config.env.dpiUrl}/${req.params.thingId.replace(
        "dcd:things:",
        ""
      )}/cancel`,
      options = {
        method: "GET",
      };
    try {
      await fetch(url, options);
      res.status(204).send();
    } catch (error) {
      return next(error);
    }
  }

  async deleteDPiImage(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const url = `${config.env.dpiUrl}/${req.params.thingId.replace(
        "dcd:things:",
        ""
      )}`,
      options = {
        method: "DELETE",
      };
    try {
      await fetch(url, options);
      res.status(204).send();
    } catch (error) {
      return next(error);
    }
  }
}
