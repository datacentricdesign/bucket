import { Request, Response, Router, NextFunction } from "express";
import config from "../../config";
import fetch from "node-fetch";
import { Log } from "../../Logger";

export class DPiController {

    static getOneDPIImage = async (req: Request, res: Response) => {
        const url = config.env.dpiUrl + '/' + req.params.thingId.replace('dcd:things:', '')
        const thingId = req.params.thingId
        const options = {
            method: 'GET'
        }
        try {
            const result = await fetch(url, options);
            const json = await result.json()
            // const blob = await result.blob()
            if (json.errorCode !== undefined) {
                res.status(json.errorCode).json(json)
            } else if (json.code === 0 && req.query.download === 'true') {
                const dpiId = thingId.replace('dcd:things:', '')
                const path = config.hostDataFolder + '/dpi/images/' + dpiId + '/deploy/image_' + dpiId + '.zip';
                return res.download((path), function (error) {
                    if (error) {
                        Log.error("Failed to serve image " + path + " Error: " + error)
                    } else {
                        Log.info("Served image " + path)
                    }
                })
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
        const dpi = req.body
        const url = config.env.dpiUrl + '/'
        dpi.id = req.params.thingId
        // TODO: fetch email from user profile
        dpi.email = ''
        const options = {
            method: 'POST',
            body: JSON.stringify(dpi),
            headers: {
                'Content-Type': 'application/json'
            }
        }
        try {
            const result = await fetch(url, options);
            const text = await result.text()
            res.status(200).json(text)
        } catch(error) {
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