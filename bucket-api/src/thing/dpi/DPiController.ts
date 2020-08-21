import { Request, Response, Router, NextFunction } from "express";
import config from "../../config";
import fetch from "node-fetch";

export class DPiController {

    static getOneDPIImage = async (req: Request, res: Response) => {
        const url = config.env.dpiUrl + '/' + req.params.thingId.replace('dcd:thing:', '')
        const options = {
            method: 'GET'
        }
        try {
            const result = await fetch(url, options);
            res.status(200).json(res.json())
        }
        catch (error) {
            return res.status(500).send(error)
        }
    };

    static generateNewDPIImage = async (req: Request, res: Response, next: NextFunction) => {
        const url = config.env.dpiUrl
        const body = req.body
        body.id = req.params.thingId
        const options = {
            method: 'POST',
            body: req.body,
            headers: {
                'Content-Type': 'application/json'
              }
        }
        try {
            const result = await fetch(url, options);
            res.status(200).json(res.json())
        }
        catch (error) {
            return res.status(500).send(error)
        }
    };

    static cancelDPiImageGeneration = async (req: Request, res: Response, next: NextFunction) => {
        const url = config.env.dpiUrl + '/' + req.params.thingId.replace('dcd:thing:', '') + '/cancel'
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
        const url = config.env.dpiUrl + '/' + req.params.thingId.replace('dcd:thing:', '')
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