import { Response, NextFunction, RequestHandler } from "express";
import { DCDError } from "@datacentricdesign/types";
import * as ws from "ws";
import { WebsocketRequestHandler } from "express-ws";
import { PolicyService } from "./PolicyService";
import { DCDRequest } from "../config";
import { Policy } from "./Policy";

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

  private async _checkPolicy(
    action: string,
    req: DCDRequest,
    next: NextFunction
  ) {
    const acpResource = buildACPResource(req);
    // For ownerships, Keto's flavor is 'regex'
    let flavor = "regex";
    let subject = req.context.userId;
    const dcdAction = "dcd:actions:" + action;
    if (req.query.sharedWith !== undefined) {
      const groupId = req.query.sharedWith as string;
      try {
        // Check that the current user is member of the mentioned group id
        await this.policyService.checkGroupMembership(subject, groupId);
        subject = groupId;
        // For consents (e.g. shared entities), Keto's flavor is 'exact'
        flavor = "exact";
        console.log("flavor exact from shared with");
      } catch {
        next(new DCDError(403, subject + " is not member of " + groupId));
      }
    } else {
      console.log("flavor regex (no shared with)");
    }

    const acp: Policy = {
      resource: acpResource,
      action: dcdAction,
      subject: subject,
    };

    this.policyService
      .check(acp, flavor)
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
  // If we look for a shared property, return the propertyId as resource
  if (
    req.params.propertyId !== undefined &&
    req.query.sharedWith !== undefined
  ) {
    return req.params.propertyId;
  }
  // Else, build the resource
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
