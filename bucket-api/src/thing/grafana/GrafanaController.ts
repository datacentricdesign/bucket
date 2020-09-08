import { Request, Response, Router, NextFunction } from "express";
import config from "../../config";
import fetch from "node-fetch";
import { Log } from "../../Logger";
import { GrafanaService } from "./GrafanaService";

export class GrafanaController {

    static grafanaService = new GrafanaService();

    static getGrafanaUserId = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const grafanaId = await GrafanaController.grafanaService.getGrafanaId(req.context.userId)
            res.status(200).send({grafanaId: grafanaId})
        }
        catch (error) {
            return next(error)
        }
    };

    static createGrafanaDashboard = async (req: Request, res: Response, next: NextFunction) => {
        const thingId = req.params.thingId
        try {
            await GrafanaController.grafanaService.createThing(req.context.userId, thingId)
            res.status(204).send()
        }
        catch (error) {
            return next(error)
        }
    };

}

export default GrafanaController;