import { Request, Response, NextFunction, RequestHandler } from "express";
import { DCDError } from "@datacentricdesign/types";
import { AuthController } from "../http/AuthController";
import * as ws from "ws";
import { WebsocketRequestHandler } from "express-ws";

/**
 * Introspect the token from the 'Authorization' HTTP header to
 * determined if it is valid and who it belongs to.
 */
export const introspectToken = (requiredScope: string[]): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    return _introspectToken(requiredScope, req, next);
  };
};

export const introspectTokenWs = (
  requiredScope: string[]
): WebsocketRequestHandler => {
  return async (ws: ws, req: Request, next: NextFunction) => {
    return _introspectToken(requiredScope, req, next);
  };
};

async function _introspectToken(
  requiredScope: string[],
  req: Request,
  next: NextFunction
) {
  if (requiredScope.length === 0) {
    requiredScope = ["dcd:things"];
  }

  try {
    const token = extractToken(req);
    return AuthController.authService
      .refresh()
      .then(() => {
        if (token.split(".").length === 3 && req.params.thingId !== undefined) {
          return AuthController.authService
            .checkJWTAuth(token, req.params.thingId)
            .then((token: any) => {
              const user = {
                entityId: req.params.thingId,
                token: token,
                sub: req.params.thingId,
              };
              return Promise.resolve(user);
            });
        } else {
          return AuthController.authService.introspect(token, requiredScope);
        }
      })
      .then((user: any) => {
        req.context = {
          userId: user.sub,
        };
        next();
      })
      .catch((error: DCDError) => next(error));
  } catch (error) {
    next(error);
  }
}

/**
 * Check and extract the token from the header
 * @param req
 * @return {*|void|string}
 */
function extractToken(req: Request): string {
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

function refresh() {
  if (this.token) {
    if (this.token.expired()) {
      return this.requestNewToken();
    }
    return Promise.resolve();
  }

  return this.requestNewToken();
}
