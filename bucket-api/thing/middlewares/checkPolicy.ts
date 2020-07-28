import { Request, Response, NextFunction } from "express";
import { DCDError } from "@datacentricdesign/types";
import { envConfig } from "../../config/envConfig";

/**
 * Check Access Control Policy with Keto, based on subject
 * @param resource
 * @param action
 */
export const checkPolicy = (resource: string, action: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (envConfig.env === 'development') {
            return next()
        }
        const acpResource = buildACPResource(resource, req)
        const acp = {
            resource: acpResource,
            action: 'dcd:actions:' + action,
            subject: req.context.userId
        }
        this.policies
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
function buildACPResource(resource: string, req: Request): string {
    // let acpResource = "dcd";
    // if (req.entityType !== undefined) {
    //   acpResource += ":" + req.entityType;
    // } else {
    //   acpResource += ":" + resource;
    // }
    let acpResource = ''
    if (req.params.entityId !== undefined) {
        acpResource += req.params.entityId
    } else {
        acpResource += 'dcd:' + resource
    }
    if (req.params.component !== undefined) {
        acpResource += ':' + req.params.component
    }
    if (req.params.propertyId !== undefined) {
        acpResource += ':' + req.params.propertyId
    }
    return acpResource
}

