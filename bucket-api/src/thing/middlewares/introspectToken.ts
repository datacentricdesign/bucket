import { Request, Response, NextFunction } from "express"
import { DCDError } from "@datacentricdesign/types"
import config from "../../config"
import { AuthController } from "../http/AuthController";

/**
   * Introspect the token from the 'Authorization' HTTP header to
   * determined if it is valid and who it belongs to.
   */
export const introspectToken = (requiredScope: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        // If running on development environment,
        // we skip the authentication and pretend we this is the DEV_USER
        // const user = {
        //     entityId: config.env.devUser,
        //     token: config.env.devToken,
        //     sub: req.params.entityId
        // }
        // Log.debug(user)
        // req.context = {
        //     userId: user.entityId
        // }
        // return next()
        if (requiredScope.length === 0) {
            requiredScope = ['dcd:things']
        }
        
        try {
            const token = extractToken(req)
            return AuthController.authService.refresh()
                .then(() => {
                    if (
                        token.split('.').length === 3 &&
                        req.params.thingId !== undefined
                    ) {
                        return AuthController.authService
                            .checkJWTAuth(token, req.params.thingId)
                            .then((token:any) => {
                                const user = {
                                    entityId: req.params.thingId,
                                    token: token,
                                    sub: req.params.thingId
                                }
                                return Promise.resolve(user)
                            })
                    } else {
                        return AuthController.authService.introspect(token, requiredScope)
                    }
                })
                .then((user:any) => {
                    req.context = {
                        userId: user.sub
                    }
                    next()
                })
                .catch((error: DCDError ) => next(error))
        } catch(error) {
            next(error)
        }
    }
};


/**
 * Check and extract the token from the header
 * @param req
 * @return {*|void|string}
 */
function extractToken(req: Request): any | void | string {
    if (req.get('Authorization') === undefined) {
        throw new DCDError(4031, 'Add \'Authorization\' header.')
    } else if (
        !req.get('Authorization').startsWith('bearer ') &&
        !req.get('Authorization').startsWith('Bearer ')
    ) {
        throw new DCDError(
            4031,
            'Add \'bearer \' in front of your \'Authorization\' token.'
        )
    }
    return req
        .get('Authorization')
        .replace(/bearer\s/gi, '')
        .replace(/Bearer\s/gi, '')
}

function refresh() {
    if (this.token) {
        if (this.token.expired()) {
            return this.requestNewToken()
        }
        return Promise.resolve()
    }

    return this.requestNewToken()
}