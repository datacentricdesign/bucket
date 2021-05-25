import { Response, NextFunction } from "express";
import { DCDRequest } from "../../config";
import { GrafanaService } from "./GrafanaService";

export class GrafanaController {
  private grafanaService: GrafanaService;

  constructor() {
    this.grafanaService = new GrafanaService();
  }

  getGrafanaUserId = async (
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      const grafanaId = await this.grafanaService.getGrafanaId(
        req.context.userId
      );
      res.status(200).send({ grafanaId });
    } catch (error) {
      if (error._hint === "Service unavailable.") {
        return res.status(503).send(error);
      }
      return next(error);
    }
  };

  createGrafanaDashboard = async (
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { thingId } = req.params;
    try {
      await this.grafanaService.createThing(req.context.userId, thingId);
      res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };
}
