import { Response, NextFunction } from "express";
import { DCDRequest } from "../../config";
import { GrafanaService } from "./GrafanaService";

export class GrafanaController {
  static grafanaService = new GrafanaService();

  static getGrafanaUserId = async (
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      const grafanaId = await GrafanaController.grafanaService.getGrafanaId(
        req.context.userId
      );
      res.status(200).send({ grafanaId: grafanaId });
    } catch (error) {
      if (error._hint === "Service unavailable.") {
        return res.status(503).send(error);
      }
      return next(error);
    }
  };

  static createGrafanaDashboard = async (
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const thingId = req.params.thingId;
    try {
      await GrafanaController.grafanaService.createThing(
        req.context.userId,
        thingId
      );
      res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };
}

export default GrafanaController;
