import { Request, Response, Router, NextFunction } from "express";
import config from "../../config";
import fetch from "node-fetch";
import * as fs from 'fs'
import { Log } from "../../Logger";
import { AuthController } from "../http/AuthController";
import { DCDError } from "@datacentricdesign/types";
import { StravaService } from "./StravaService";

export class StravaController {

    static stravaService = new StravaService()

    static healthStatus = async (req: Request, res: Response, next: NextFunction) => {
        const url = config.env.dpiUrl + '/health'
        const options = {
            method: 'GET'
        }
        try {
            const result = await fetch(url, options);
            const json = await result.json()
            res.status(200).send(json)
        }
        catch (error) {
            const dcdError = new DCDError(503, "Service not available.")
            dcdError._statusCode = 503
            return next(dcdError)
        }
    };

    static syncActivities = async (req: Request, res: Response, next: NextFunction) => {
        // // Get the property ID from the url
        // const thingId = req.params.thingId;
        // const propertyId = req.params.propertyId;
        // const from = req.query.from as string;
        // const timeInterval = req.query.timeInterval as string;
        // // Call the Service
        // try {
        //     const result = await StravaController.stravaService.syncActivities(thingId)
        //     res.status(200).send(result);
        // } catch (error) {
        //     next(error)
        // }
    };

}

export default StravaController;