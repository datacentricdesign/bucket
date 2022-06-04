import { Request, Response, NextFunction } from "express";
import config from "../../config";
import fetch from "node-fetch";
import { DCDError } from "@datacentricdesign/types";
import { DPiService } from "./DPiService";

export class DPiController {
  private static instance: DPiController;

  public static getInstance(): DPiController {
    if (DPiController.instance === undefined) {
      DPiController.instance = new DPiController();
    }
    return DPiController.instance;
  }

  private dpiService: DPiService;

  private constructor() {
    this.dpiService = DPiService.getInstance();
  }

  public async healthStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const url = config.env.dpiUrl + "/health";
    const options = {
      method: "GET",
    };
    try {
      const result = await fetch(url, options);
      const json = await result.json();
      res.status(200).send(json);
    } catch (error) {
      const dcdError = new DCDError(503, "Service now available.");
      dcdError._statusCode = 503;
      return next(dcdError);
    }
  }

  public async getOneDPIImage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const url =
      config.env.dpiUrl + "/" + req.params.thingId.replace("dcd:things:", "");
    const thingId = req.params.thingId;
    const options = {
      method: "GET",
    };
    try {
      const result = await fetch(url, options);
      const json = await result.json();
      if (json.errorCode !== undefined) {
        res.status(json.errorCode).json(json);
        const dcdError = new DCDError(json.errorCode, json);
        dcdError._statusCode = json.errorCode;
        return next(dcdError);
      } else if (json.code === 0 && req.query.download === "true") {
        const dpiId = thingId.replace("dcd:things:", "");
        const downloadURL = config.env.dpiUrl + "/" + dpiId + "?download=true";
        const result = await fetch(downloadURL);
        await new Promise<void>((resolve, reject) => {
          result.body.pipe(res);
          result.body.on("error", (error) => {
            reject(error);
          });
          res.on("finish", function () {
            resolve();
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

  public async generateNewDPIImage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const text = await this.dpiService.generateDPiImage(
        req.body,
        req.params.thingId
      );
      res.send(text);
    } catch (error) {
      return next(error);
    }
  }

  public async cancelDPiImageGeneration(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const url =
      config.env.dpiUrl +
      "/" +
      req.params.thingId.replace("dcd:things:", "") +
      "/cancel";
    const options = {
      method: "GET",
    };
    try {
      await fetch(url, options);
      res.status(204).send();
    } catch (error) {
      return next(error);
    }
  }

  public async deleteDPiImage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const url =
      config.env.dpiUrl + "/" + req.params.thingId.replace("dcd:things:", "");
    const options = {
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

export default DPiController;
