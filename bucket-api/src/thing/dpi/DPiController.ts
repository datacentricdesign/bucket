import { Request, Response, Router, NextFunction } from "express";
import config from "../../config";
import fetch from "node-fetch";
import * as fs from 'fs'
import { Log } from "../../Logger";
import { AuthController } from "../http/AuthController";
import { DCDError } from "@datacentricdesign/types";
import { DPiService } from "./DPiService";

export class DPiController {

    static dpiService = new DPiService()

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
            return res.status(503).send(new DCDError(503, "Service now available."))
        }
    };

    static getOneDPIImage = async (req: Request, res: Response) => {
        const url = config.env.dpiUrl + '/' + req.params.thingId.replace('dcd:things:', '')
        const thingId = req.params.thingId
        const options = {
            method: 'GET'
        }
        try {
            const result = await fetch(url, options);
            const json = await result.json()
            if (json.errorCode !== undefined) {
                res.status(json.errorCode).json(json)
            } else if (json.code === 0 && req.query.download === 'true') {
                const dpiId = thingId.replace('dcd:things:', '')

                const downloadURL = config.env.dpiUrl + '/' + dpiId + "?download=true"
                const result = await fetch(downloadURL);
                await new Promise((resolve, reject) => {
                    result.body.pipe(res);
                    result.body.on("error", (err) => {
                        reject(err);
                    });
                    res.on("finish", function () {
                        resolve();
                    });
                });
            } else {
                res.status(200).json(json)
            }
        }
        catch (error) {
            if (error.errorCode === 404) {
                return res.status(404).send(error)
            }
            return res.status(500).send(error)
        }
    };

    static generateNewDPIImage = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const text = await DPiController.dpiService.generateDPiImage(req.body, req.params.thingId)
            res.send(text)
        } catch (error) {
            return next(error)
        }
    };

    static cancelDPiImageGeneration = async (req: Request, res: Response, next: NextFunction) => {
        const url = config.env.dpiUrl + '/' + req.params.thingId.replace('dcd:things:', '') + '/cancel'
        const options = {
            method: 'GET'
        }
        try {
            const result = await fetch(url, options);
            res.status(204).send()
        }
        catch (error) {
            return res.status(500).send(error)
        }
    };

    static deleteDPiImage = async (req: Request, res: Response, next: NextFunction) => {
        const url = config.env.dpiUrl + '/' + req.params.thingId.replace('dcd:things:', '')
        const options = {
            method: 'DELETE'
        }
        try {
            const result = await fetch(url, options);
            res.status(204).send()
        }
        catch (error) {
            return res.status(500).send(error)
        }
    };
}

export default DPiController;