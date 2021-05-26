import { Response, NextFunction } from "express";
import { DCDRequest } from "../../config";
import { GrafanaService } from "./GrafanaService";

class GrafanaController {
  private grafanaService: GrafanaService;

  constructor() {
    this.grafanaService = new GrafanaService();
  }

  getGrafanaUserId = async (
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const grafanaId = await GrafanaService.getGrafanaId(req.context.userId);
      res.status(200).send({ grafanaId });
    } catch (error) {
      if (error._hint === "Service unavailable.") {
        res.status(503).send(error);
      } else {
        next(error);
      }
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
      next(error);
    }
  };
}

export default GrafanaController;
