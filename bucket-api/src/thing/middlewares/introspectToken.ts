import { Response, NextFunction, RequestHandler } from "express";
import { DCDError } from "@datacentricdesign/types";
import { AuthController } from "../http/AuthController";
import * as ws from "ws";
import { WebsocketRequestHandler } from "express-ws";
import { DCDRequest } from "../../config";
import { Token } from "simple-oauth2";

interface User {
  entityId?: string;
  token?: string;
  sub?: string;
  token_type?: string;
}

/**
 * Introspect the token from the 'Authorization' HTTP header to
 * determined if it is valid and who it belongs to.
 */
export const introspectToken = (requiredScope: string[]): RequestHandler => {
  return async (req: DCDRequest, res: Response, next: NextFunction) => {
    return _introspectToken(requiredScope, req, next);
  };
};

export const introspectTokenWs = (
  requiredScope: string[]
): WebsocketRequestHandler => {
  return async (ws: ws, req: DCDRequest, next: NextFunction) => {
    return _introspectToken(requiredScope, req, next);
  };
};

async function _introspectToken(
  requiredScope: string[],
  req: DCDRequest,
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
            .then((token: Token) => {
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
      .then((user: User) => {
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

// function refresh() {
//   if (this.token) {
//     if (this.token.expired()) {
//       return this.requestNewToken();
//     }
//     return Promise.resolve();
//   }

//   return this.requestNewToken();
// }
