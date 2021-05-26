import { Response, NextFunction } from "express";
import { DCDError } from "@datacentricdesign/types";
import AuthController from "../http/AuthController";
import { DCDRequest } from "../../config";
import { TokenIntrospection } from "../services/AuthService";

/**
 * Introspect the token from the 'Authorization' HTTP header to
 * determined if it is valid and who it belongs to.
 */
const introspectToken = (requiredScope: string[]) => {
  return async (
    req: DCDRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (requiredScope.length === 0) {
      requiredScope = ["dcd:things"];
    }

    try {
      const tokenStr = extractToken(req);
      await AuthController.authService.refresh();

      let user: TokenIntrospection;
      // if the token include 3 dot, its a Thing token (JWT)
      if (
        tokenStr.split(".").length === 3 &&
        req.params.thingId !== undefined
      ) {
        await AuthController.authService.checkJWTAuth(
          tokenStr,
          req.params.thingId
        );
        user = {
          sub: req.params.thingId,
        };
        // Otherwise, it's a Person token
      } else {
        user = await AuthController.authService.introspect(
          tokenStr,
          requiredScope
        );
      }
      // Reaching this stage without expection: the user is authorized
      req.context = {
        userId: user.sub,
      };
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check and extract the token from the header
 * @param req
 * @return {*|void|string}
 */
function extractToken(req: DCDRequest): string {
  if (req.get("Authorization") === undefined) {
    throw new DCDError(4031, "Add 'Authorization' header.");
  } else if (
    !req.get("Authorization").startsWith("bearer ") &&
    !req.get("Authorization").startsWith("Bearer ")
  ) {
    throw new DCDError(
      4031,
      "Add 'bearer ' in front of your 'Authorization' token."
    );
  }
  return req
    .get("Authorization")
    .replace(/bearer\s/gi, "")
    .replace(/Bearer\s/gi, "");
}

export default introspectToken;
