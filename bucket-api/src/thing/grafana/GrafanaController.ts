import { Response, NextFunction } from "express";
import { DCDRequest } from "../../config";
import { GrafanaService } from "./GrafanaService";

export class GrafanaController {

  private static instance: GrafanaController;

  public static getInstance(): GrafanaController {
    if (GrafanaController.instance === undefined) {
      GrafanaController.instance = new GrafanaController();
    }
    return GrafanaController.instance;
  }

  private grafanaService = new GrafanaService();

  public async getGrafanaUserId (
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const grafanaId = await this.grafanaService.getGrafanaId(
        req.context.userId
      );
      res.status(200).send({ grafanaId: grafanaId });
    } catch (error) {
      if (error._hint === "Service unavailable.") {
        res.status(503).send(error);
      } else {
        next(error);
      }
    }
  };

  public async createGrafanaDashboard(
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const thingId = req.params.thingId;
    try {
      await this.grafanaService.createThing(
        req.context.userId,
        thingId
      );
      res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };
}

