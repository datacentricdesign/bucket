import { Response, NextFunction, RequestHandler } from "express";
import { DCDError } from "@datacentricdesign/types";
import * as ws from "ws";
import { WebsocketRequestHandler } from "express-ws";
import { Policy, PolicyService } from "./PolicyService";
import { DCDRequest } from "../config";

export class PolicyController {
  private static instance: PolicyController;

  public static getInstance(): PolicyController {
    if (PolicyController.instance === undefined) {
      PolicyController.instance = new PolicyController();
    }
    return PolicyController.instance;
  }

  private policyService: PolicyService;

  private constructor() {
    this.policyService = PolicyService.getInstance();
  }

  /**
   * Check Access Control Policy with Keto, based on subject
   * @param action
   */
  public checkPolicy(action: string): RequestHandler {
    return async (req: DCDRequest, res: Response, next: NextFunction) => {
      return this._checkPolicy(action, req, next);
    };
  }

  public checkPolicyWs(action: string): WebsocketRequestHandler {
    return async (ws: ws, req: DCDRequest, next: NextFunction) => {
      return this._checkPolicy(action, req, next);
    };
  }

  private _checkPolicy(action: string, req: DCDRequest, next: NextFunction) {
    const acpResource = buildACPResource(req);
    const acp: Policy = {
      resource: acpResource,
      action: "dcd:actions:" + action,
      subject: req.context.userId,
    };
    this.policyService
      .check(acp)
      .then(() => next())
      .catch((error: DCDError) => next(error));
  }
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
