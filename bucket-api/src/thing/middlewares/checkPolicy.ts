import { Response, NextFunction, RequestHandler } from "express";
import { DCDError } from "@datacentricdesign/types";
import { AuthController } from "../http/AuthController";
import * as ws from "ws";
import { WebsocketRequestHandler } from "express-ws";
import { Policy } from "../services/PolicyService";
import { DCDRequest } from "../../config";

/**
 * Check Access Control Policy with Keto, based on subject
 * @param action
 */
export const checkPolicy = (action: string): RequestHandler => {
  return async (req: DCDRequest, res: Response, next: NextFunction) => {
    return _checkPolicy(action, req, next);
  };
};

export const checkPolicyWs = (action: string): WebsocketRequestHandler => {
  return async (ws: ws, req: DCDRequest, next: NextFunction) => {
    return _checkPolicy(action, req, next);
  };
};

async function _checkPolicy(
  action: string,
  req: DCDRequest,
  next: NextFunction
) {
  const acpResource = buildACPResource(req);
  const acp: Policy = {
    resource: acpResource,
    action: "dcd:actions:" + action,
    subject: req.context.userId,
  };
  AuthController.policyService
    .check(acp)
    .then(() => next())
    .catch((error: DCDError) => next(error));
}

/**
 * Build ACP resource from request path
 * @param resource
 * @param req
 * @return {string}
 */
function buildACPResource(req: DCDRequest): string {
  let acpResource = "";
  if (req.params.thingId !== undefined) {
    acpResource += req.params.thingId;
  }
  if (req.baseUrl.endsWith("/properties")) {
    acpResource += ":properties";
  }
  if (req.params.propertyId !== undefined) {
    acpResource += ":" + req.params.propertyId.replace("dcd:", "");
  }
  if (req.params.consentId !== undefined) {
    acpResource += ":" + req.params.consentId.replace("dcd:", "");
  }
  return acpResource;
}
