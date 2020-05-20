import { Request, Response, NextFunction } from "express";
import { DCDError } from "../../types/DCDError";
import { envConfig } from "../../config/envConfig";
import { Context } from "../../config";

/**
   * Introspect the token from the 'Authorization' HTTP header to
   * determined if it is valid and who it belongs to.
   */
export const introspectToken = (requiredScope: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        // If running on development environment,
        // we skip the authentication and pretend we this is the DEV_USER
        if (envConfig.env === 'development') {
            const user = {
                entityId: envConfig.devUser,
                token: envConfig.devToken,
                sub: req.params.entityId
            }
            req.context = new Context(user.entityId)
            return next()
        }
        if (requiredScope.length === 0 && req.params.entity !== undefined) {
            requiredScope = [req.params.entity]
        }
        const token = extractToken(req)
        return this.refresh()
            .then(() => {
                if (
                    token.split('.').length === 3 &&
                    req.params.entityId !== undefined
                ) {
                    return this.model.auth
                        .checkJWTAuth(token, req.params.entityId)
                        .then((token:any) => {
                            const user = {
                                entityId: req.params.entityId,
                                token: token,
                                sub: req.params.entityId
                            }
                            return Promise.resolve(user)
                        })
                } else {
                    return this.model.auth.introspect(token, requiredScope)
                }
            })
            .then((user:any) => {
                req.context = new Context(user.entityId)
                next()
            })
            .catch((error: DCDError ) => next(error))
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