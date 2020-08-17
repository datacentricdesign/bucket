import { Request, Response, NextFunction } from "express";
import { DCDError } from "@datacentricdesign/types";
import { envConfig } from "../../config/envConfig";
import { AuthController } from "../http/AuthController";

/**
 * Check Access Control Policy with Keto, based on subject
 * @param resource
 * @param action
 */
export const checkPolicy = (action: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const acpResource = buildACPResource(req)
        const acp = {
            resource: acpResource,
            action: 'dcd:actions:' + action,
            subject: req.context.userId
        }
        console.log(acp)
        AuthController.policyService
            .check(acp)
            .then(() => next())
            .catch((error: DCDError) => next(error))
    }
};

/**
 * Build ACP resource from request path
 * @param resource
 * @param req
 * @return {string}
 */
function buildACPResource(req: Request): string {
    let acpResource = ''
    if (req.params.thingId !== undefined) {
        acpResource += req.params.thingId
    }
    if (req.params.propertyId !== undefined) {
        acpResource += ':' + req.params.propertyId.replace('dcd:','')
    }
    if (req.params.consentId !== undefined) {
        acpResource += ':' + req.params.consentId.replace('dcd:','')
    }
    return acpResource
}

