import * as jwkToBuffer from 'jwk-to-pem'
import * as jwt from 'jsonwebtoken'
import { JWK } from 'node-jose'
import { v4 as uuidv4 } from 'uuid';

import fetch from 'node-fetch'
import { RequestInit } from 'node-fetch'
import * as qs from 'querystring'
import * as SimpleOauth from 'simple-oauth2'
import { DCDError } from '@datacentricdesign/types'
import { Token } from './ThingService'
import { PolicyService } from './PolicyService'
import config from '../../config'
import { URL } from 'url'
import { Log } from '../../Logger'

/**
 * This class handle Authentication and Authorisation processes
 */
export class AuthService {

    oauth2: SimpleOauth.ClientCredentials
    token = null
    jwtTokenMap = []
    private static policyService = new PolicyService()

    constructor() {
        const header = {
            Accept: 'application/json'
        }
        if (config.http.secured) {
            header['X-Forwarded-Proto'] = 'https'
        }
        const params: SimpleOauth.ModuleOptions = {
            client: {
                id: config.oauth2.oAuth2ClientId,
                secret: config.oauth2.oAuth2ClientSecret
            },
            auth: {
                tokenHost: new URL(config.oauth2.oAuth2TokenURL).origin,
                tokenPath: new URL(config.oauth2.oAuth2TokenURL).pathname,
                revokePath: new URL(config.oauth2.oAuth2RevokeURL).pathname
            },
            http: {
                headers: header
            },
            options: {
                bodyFormat: 'form'
            }
        }
        this.oauth2 = new SimpleOauth.ClientCredentials(params)
    }

    /**
     * @param {string} token
     * @param {Array<string>} requiredScope
     * @return {Promise<any>}
     */
    introspect(token: Token, requiredScope: string[] = []) {
        const body = { token: token }
        // const body = { token: token, scope: requiredScope.join(" ") };
        const url = config.oauth2.oAuth2IntrospectURL

        return this.authorisedRequest(
            'POST',
            url,
            body,
            'application/x-www-form-urlencoded'
        )
            .then(body => {
                if (!body.active) {
                    return Promise.reject(
                        new DCDError(4031, 'The bearer token is not active')
                    )
                }
                if (body.token_type && body.token_type !== 'access_token') {
                    return Promise.reject(
                        new DCDError(4031, 'The bearer token is not an access token')
                    )
                }
                return Promise.resolve(body)
            })
            .catch(error => {
                return Promise.reject(error)
            })
    }

    /**
     * Generate a Json Web Token (JWT) out of a private key
     * @param {String} privateKey
     * @returns {*}
     */
    generateJWT(privateKey: string): string {
        const currentTime = Math.floor(Date.now() / 1000)
        const token = {
            iat: currentTime - 3600,
            exp: currentTime + 10 * 31557600, // 10 years
            aud: config.http.url
        }
        const algorithm = 'RS256'
        return jwt.sign(token, privateKey, { algorithm: algorithm })
    }

    /**
       * Generate a JWK set of keys for a given thing id.
       * @param {string} thingId
       * @returns {Promise<Object>}
       */
    generateKeys(thingId) {
        const jwkParams = {
            kid: uuidv4(),
            alg: 'RS256',
            use: 'sig'
        }
        return this.refresh().then(() => {
            return this.generateJWK(thingId, jwkParams)
        })
    }

    /**
     * Generate a set of private/public keys out of a JWK managed by Hydra.
     * @param set
     * @param body
     * @returns {Promise}
     */
    generateJWK(set: string, body: any) {
        const url = config.oauth2.oAuth2HydraAdminURL + '/keys/' + set
        return this.authorisedRequest('POST', url, body)
            .then(result => {
                const jwk = result.keys[0]
                jwk.dp = ''
                jwk.dq = ''
                jwk.qi = ''
                const privateKey = jwkToBuffer(jwk, { private: true })
                // Convert the JWK into a public key
                this.jwtTokenMap[set] = jwkToBuffer(jwk)
                const keySet = {
                    algorithm: jwk.alg,
                    privateKey: privateKey
                }
                return Promise.resolve(keySet)
            })
            .catch(error => {
                return Promise.reject(new DCDError(403, error.message))
            })
    }

    /**
     * Retrieves the key set for the given key ID from Hydra,
     * then extract the public key and caches it in the map of keys.
     * @param {string} setId
     * @returns {Promise<string|DCDError>}
     */
    getJWK(setId: string) {
        const url = config.oauth2.oAuth2HydraAdminURL + '/keys/' + setId
        return this.authorisedRequest('GET', url)
            .then(result => {
                const jwk = result.keys[0]
                // Convert the JWK into a public key
                const publicKey = jwkToBuffer(jwk)
                this.jwtTokenMap[setId] = publicKey
                return Promise.resolve(publicKey)
            })
            .catch(error => {
                return Promise.reject(error)
            })
    }

    async setJWK(setId: string, jwk: any) {
        const url = config.oauth2.oAuth2HydraAdminURL + '/keys/' + setId
        return this.refresh()
            .then(() => {
                return this.authorisedRequest('PUT', url, { keys: [jwk] });
            })
            .then((result) => {
                const createdJWK = result.keys[0]
                // Convert the JWK into a public key, and store it for later use
                this.jwtTokenMap[setId] = jwkToBuffer(createdJWK)
                return Promise.resolve(createdJWK)
            })
            .catch(error => {
                return Promise.reject(error)
            })
    }

    setPEM(setId: string, pem: string) {
        const keystore = JWK.createKeyStore();
        return keystore.add(pem, 'pem').
            then((result: JWK.Key) => {
                return this.setJWK(setId, result.toJSON())
            }).catch( error => {
                return Promise.reject(error)
            });
    }

    checkJWT(acp: any, entity: string) {
        if (!this.jwtTokenMap.hasOwnProperty(entity)) {
            return this.refresh()
                .then(() => {
                    return this.getJWK(entity)
                        .then(() => {
                            return this.checkJWT(acp, entity)
                        })
                        .catch(() => {
                            return Promise.reject(new DCDError(404, 'Unknown key set'))
                        })
                })
                .catch(error => {
                    return Promise.reject(error)
                })
        }
        const introspectionToken: any = jwt.verify(acp.token, this.jwtTokenMap[entity])
        const currentTime = Math.floor(new Date().getMilliseconds() / 1000)

        if (
            introspectionToken.aud !== undefined &&
            introspectionToken.aud === config.http.url &&
            introspectionToken.exp !== undefined &&
            introspectionToken.exp > currentTime
        ) {
            return AuthService.policyService.check(acp)
        } else {
            return Promise.reject(new DCDError(403, 'Token expired'))
        }
    }

    /**
     * Check JWK cache, fetch it
     * @param token 
     * @param entity 
     */
    checkJWTAuth(token: string, thingId: string) {
        Log.debug("\ncheck JWT auth\n")
        // Public keys are cached by thingId, we check if this one is cached
        if (!this.jwtTokenMap.hasOwnProperty(thingId)) {
            // Not found, let's get it from keto
            return this.refresh()
                .then(() => {
                    return this.getJWK(thingId)
                        .then((publicKey) => {
                            // Now that we have the JWK, let's rerun the function
                            return this.checkJWTAuth(token, thingId)
                        })
                        .catch((error) => {
                            return Promise.reject(new DCDError(404, 'Unknown key set'))
                        })
                })
                .catch(error => {
                    return Promise.reject(error)
                })
        }

        return jwt.verify(
            token.toString(),
            this.jwtTokenMap[thingId],
            {},
            (error: Error, introspectionToken: Token) => {
                if (error) {
                    Log.error(error)
                    return Promise.reject(error)
                }
                const currentTime = Math.floor(new Date().getMilliseconds() / 1000)

                Log.debug(introspectionToken)
                if (
                    introspectionToken.aud !== undefined &&
                    introspectionToken.aud === config.http.url &&
                    introspectionToken.exp !== undefined &&
                    introspectionToken.exp > currentTime
                ) {
                    return Promise.resolve(introspectionToken)
                } else {
                    return Promise.reject(new DCDError(403, 'Token expired'))
                }
            }
        )
    }

    refresh() {
        if (this.token) {
            if (this.token.expired()) {
                return this.requestNewToken()
            }
            return Promise.resolve()
        }
        return this.requestNewToken()
    }

    requestNewToken() {
        return this.oauth2.getToken({ scope: config.oauth2.oAuth2Scope })
            .then(result => {
                this.token = this.oauth2.createToken(result)
                return Promise.resolve()
            })
            .catch(error => {
                return Promise.reject(error)
            })
    }

    getBearer() {
        return 'bearer ' + qs.escape(this.token.token.access_token)
    }

    /**
     * Build HTTP request with token and return the result
     * @param {String} method
     * @param {String} url
     * @param {Object} body (optional)
     * @param {String} type (default: application/json)
     * @returns {Promise}
     */
    async authorisedRequest(method: string, url: string, body: object = null, type: string = 'application/json'): Promise<any> {
        const options: RequestInit = {
            headers: {
                Authorization: this.getBearer(),
                'Content-Type': type,
                Accept: 'application/json'
            },
            method: method,
            timeout: 15000
        }
        if (config.http.secured) {
            options.headers['X-Forwarded-Proto'] = 'https'
        }
        if (body !== null) {
            let bodyStr = ''
            if (type === 'application/x-www-form-urlencoded') {
                bodyStr = qs.stringify(body as qs.ParsedUrlQueryInput)
            } else {
                bodyStr = JSON.stringify(body)
            }
            options.headers['Content-Length'] = bodyStr.length
            options.body = bodyStr
        }
        try {
            const res = await fetch(url, options)
            if (res.ok) {
                return res.json()
            }
            return Promise.reject(new DCDError(res.status, res.statusText))
        }
        catch (error) {
            return Promise.reject(error)
        }
    }
}
