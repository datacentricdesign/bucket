import * as jwkToBuffer from 'jwk-to-pem'
import * as jwt from 'jsonwebtoken'
import { pem2jwk } from 'pem-jwk'

import fetch from 'node-fetch'
import {RequestInit} from 'node-fetch'
import * as qs from 'querystring'
import * as SimpleOauth from 'simple-oauth2'
import { httpConfig } from '../../config/httpConfig'
import { authConfig } from '../../config/authConfig'
import { DCDError } from '@datacentricdesign/types'
import { Token } from './ThingService'
import { PolicyService } from './PolicyService'

/**
 * This class handle Authentication and Authorisation processes
 * when interacting with the DCD Hub.
 */
export class AuthService {

    oauth2: any
    token = null
    jwtTokenMap = []
    private static policyService = new PolicyService()

    constructor() {
        const header = {
            Accept: 'application/json'
        }
        if (httpConfig.secured) {
            header['X-Forwarded-Proto'] = 'https'
        }
        const params: SimpleOauth.ModuleOptions = {
            client: {
                id: process.env.OAUTH2_CLIENT_ID,
                secret: process.env.OAUTH2_CLIENT_SECRET
            },
            auth: {
                tokenHost: 'http://' + authConfig.oAuth2TokenURL.host,
                tokenPath: authConfig.oAuth2TokenURL.path,
                revokePath: authConfig.oAuth2RevokeURL.path
            },
            http: {
                headers: header
            },
            options: {
                bodyFormat: 'form'
            }
        }
        this.oauth2 = SimpleOauth.create(params)
    }

    /**
     * @param {string} token
     * @param {Array<string>} requiredScope
     * @return {Promise<any>}
     */
    introspect(token: Token, requiredScope: string[] = []) {
        const body = { token: token }
        // const body = { token: token, scope: requiredScope.join(" ") };
        const url = process.env.OAUTH2_INTROSPECT_URL
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
                // const scopeArray = body.scope.split(" ");
                // logger.debug("provided scope:");
                // logger.debug(scopeArray);
                // for (let index = 0; index < requiredScope.length; index++) {
                //   logger.debug("looking for required scope " + requiredScope[index]);
                //   if (!scopeArray.includes(requiredScope[index])) {
                //     logger.debug("array does not include " + requiredScope[index]);
                //     return Promise.reject(
                //       new DCDError(
                //         4031,
                //         "The bearer token does not grant access to the required scope " +
                //           requiredScope[index]
                //       )
                //     );
                //   }
                // }
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
    generateJWT(privateKey) {
        const currentTime = Math.floor(Date.now() / 1000)
        const token = {
            iat: currentTime - 3600,
            exp: currentTime + 10 * 31557600, // 10 years
            aud: process.env.API_URL
        }
        const algorithm = 'RS256'
        return jwt.sign(token, privateKey, { algorithm: algorithm })
    }

    /**
     * Generate a set of private/public keys out of a JWK managed by Hydra.
     * @param set
     * @param body
     * @returns {Promise}
     */
    generateJWK(set, body) {
        const url = process.env.HYDRA_ADMIN_URL + '/keys/' + set
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
    getJWK(setId) {
        const url = process.env.HYDRA_ADMIN_URL + '/keys/' + setId
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
        const url = process.env.HYDRA_ADMIN_URL + '/keys/' + setId
        try {
            const result = await this.authorisedRequest('PUT', url, jwk)
            const createdJWK = result.keys[0]
            // Convert the JWK into a public key, and store it for later use
            this.jwtTokenMap[setId] = jwkToBuffer(createdJWK)
            return Promise.resolve(createdJWK)
        }
        catch (error) {
            return Promise.reject(error)
        }
    }

    setPEM(setId: string, pem: string) {
        return this.setJWK(setId, pem2jwk(pem))
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
        const introspectionToken:any = jwt.verify(acp.token, this.jwtTokenMap[entity])
        const currentTime = Math.floor(new Date().getMilliseconds() / 1000)

        if (
            introspectionToken.aud !== undefined &&
            introspectionToken.aud === httpConfig.url &&
            introspectionToken.exp !== undefined &&
            introspectionToken.exp > currentTime
        ) {
            return AuthService.policyService.check(acp)
        } else {
            return Promise.reject(new DCDError(403, 'Token expired'))
        }
    }

    checkJWTAuth(token: string, entity: string) {
        if (!this.jwtTokenMap.hasOwnProperty(entity)) {
            return this.refresh()
                .then(() => {
                    return this.getJWK(entity)
                        .then(() => {
                            return this.checkJWTAuth(token, entity)
                        })
                        .catch(() => {
                            return Promise.reject(new DCDError(404, 'Unknown key set'))
                        })
                })
                .catch(error => {
                    return Promise.reject(error)
                })
        }
        return jwt.verify(
            token.toString(),
            this.jwtTokenMap[entity],
            {},
            (error: Error, introspectionToken: Token) => {
                if (error) {
                    return Promise.reject(error)
                }
                const currentTime = Math.floor(new Date().getMilliseconds() / 1000)

                if (
                    introspectionToken.aud !== undefined &&
                    introspectionToken.aud === httpConfig.url &&
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
        return this.oauth2.clientCredentials
            .getToken({ scope: authConfig.scope })
            .then(result => {
                this.token = this.oauth2.accessToken.create(result)
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
        const options:RequestInit = {
            headers: {
                Authorization: this.getBearer(),
                'Content-Type': type,
                Accept: 'application/json'
            },
            method: method,
            timeout: 15000
        }
        if (httpConfig.secured) {
            options.headers['X-Forwarded-Proto'] = 'https'
        }
        if (body !== null) {
            let bodyStr = ''
            if (type === 'application/x-www-form-urlencoded') {
                bodyStr = qs.stringify(body)
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
