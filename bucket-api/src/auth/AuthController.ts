import { Response, NextFunction, RequestHandler } from "express";
import { DCDError } from "@datacentricdesign/types";
import * as ws from "ws";
import { WebsocketRequestHandler } from "express-ws";
import { DCDRequest } from "../config";
import { AuthService, User } from "./AuthService";
import { Log } from "../Logger";

export class AuthController {
  private static instance: AuthController;

  public static getInstance(): AuthController {
    if (AuthController.instance === undefined) {
      AuthController.instance = new AuthController();
    }
    return AuthController.instance;
  }

  private authService: AuthService;

  private constructor() {
    this.authService = AuthService.getInstance();
  }

  /**
   * Introspect the token from the 'Authorization' HTTP header to
   * determined if it is valid and who it belongs to.
   */
  authenticate(requiredScope: string[]): RequestHandler {
    return async (
      req: DCDRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      return this._authenticate(requiredScope, req, next);
    };
  }

  authenticateWs(requiredScope: string[]): WebsocketRequestHandler {
    return async (
      ws: ws,
      req: DCDRequest,
      next: NextFunction
    ): Promise<void> => {
      return this._authenticate(requiredScope, req, next);
    };
  }

  async _authenticate(
    requiredScope: string[],
    req: DCDRequest,
    next: NextFunction
  ): Promise<void> {
    if (requiredScope.length === 0) {
      requiredScope = ["dcd:things"];
    }
    try {
      const token = extractToken(req);
      let user: User = null;
      if (token.split(".").length === 3 && req.params.thingId !== undefined) {
        user = await this.authService.checkJWTAuth(token, req.params.thingId);
        Log.debug("result introspect user: " + JSON.stringify(user));
      } else {
        user = await this.authService.introspect(token, requiredScope);
      }
      req.context = {
        userId: user.sub,
      };
      next();
    } catch (error) {
      next(error);
    }
  }
}

/**
 * Check and extract the token from the header
 * @param req
 * @return {*|void|string}
 */
function extractToken(req: DCDRequest): string {
  if (req.get("Authorization") !== undefined) {
    const authorization = req.get("Authorization");
    if (
      !authorization.startsWith("bearer ") &&
      !authorization.startsWith("Bearer ")
    ) {
      throw new DCDError(
        4031,
        "Add 'bearer ' in front of your 'Authorization' token."
      );
    } else {
      return authorization.replace(/bearer\s/gi, "").replace(/Bearer\s/gi, "");
    }
  } else if (req.query.authorization !== undefined) {
    return req.query.authorization.toString();
  } else {
    throw new DCDError(4031, "Add 'Authorization' header.");
  }
}
