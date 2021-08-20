import * as jwkToBuffer from "jwk-to-pem";
import * as jwt from "jsonwebtoken";
import { JWK } from "node-jose";

import fetch from "node-fetch";
import { RequestInit } from "node-fetch";
import * as qs from "querystring";
import * as SimpleOauth from "simple-oauth2";
import { DCDError } from "@datacentricdesign/types";
import config from "../config";
import { URL } from "url";
import { Log } from "../Logger";

import { generateKeyPair } from "crypto";

export interface KeySet {
  algorithm: string;
  privateKey: string;
}

export interface User {
  entityId?: string;
  token?: string;
  sub?: string;
  token_type?: string;
}

interface IntrospectionResult {
  active: boolean;
  aud: string[];
  client_id: string;
  exp: number;
  ext: Record<string, unknown>;
  iat: number;
  iss: string;
  nbf: number;
  obfuscated_subject: string;
  scope: string;
  sub: string;
  token_type: string;
  username: string;
}

/**
 * This class handle Authentication and Authorisation processes
 */
export class AuthService {
  private static instance: AuthService;

  public static getInstance(): AuthService {
    if (AuthService.instance === undefined) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private oauth2: SimpleOauth.ClientCredentials;
  private token = null;
  private jwtTokenMap = [];

  private constructor() {
    const header = {
      Accept: "application/json",
    };
    if (config.http.secured) {
      header["X-Forwarded-Proto"] = "https";
    }
    const params: SimpleOauth.ModuleOptions = {
      client: {
        id: config.oauth2.oAuth2ClientId,
        secret: config.oauth2.oAuth2ClientSecret,
      },
      auth: {
        tokenHost: new URL(config.oauth2.oAuth2TokenURL).origin,
        tokenPath: new URL(config.oauth2.oAuth2TokenURL).pathname,
        revokePath: new URL(config.oauth2.oAuth2RevokeURL).pathname,
      },
      http: {
        headers: header,
      },
      options: {
        bodyFormat: "form",
      },
    };
    this.oauth2 = new SimpleOauth.ClientCredentials(params);
  }

  /**
   * @param {string} token
   * @param {Array<string>} requiredScope
   * @return {Promise<any>}
   */
  async introspect(token: string, requiredScope: string[] = []): Promise<User> {
    const body = { token: token, scope: requiredScope.join(" ") };
    Log.debug(body);
    const url = config.oauth2.oAuth2IntrospectURL;

    try {
      const result: IntrospectionResult = await this.authorisedRequest(
        "POST",
        url,
        body,
        "application/x-www-form-urlencoded"
      );
      if (!result.active) {
        return Promise.reject(
          new DCDError(4031, "The bearer token is not active")
        );
      }
      if (result.token_type && result.token_type !== "access_token") {
        return Promise.reject(
          new DCDError(4031, "The bearer token is not an access token")
        );
      }
      return Promise.resolve({
        entityId: result.sub,
        token: token,
        sub: result.sub,
        token_type: result.token_type,
      });
    } catch (error) {
      return Promise.reject(error);
    }
  }

  generateKeys(thingId: string): Promise<KeySet> {
    return new Promise((resolve, reject) => {
      generateKeyPair(
        "rsa",
        {
          modulusLength: 4096,
          publicKeyEncoding: {
            type: "spki",
            format: "pem",
          },
          privateKeyEncoding: {
            type: "pkcs8",
            format: "pem",
          },
        },
        async (error, publicKey, privateKey) => {
          // Handle errors and use the generated key pair.
          if (error) {
            reject(error);
          } else {
            await this.setPEM(thingId, publicKey);
            resolve({
              algorithm: "RS256",
              privateKey: privateKey,
            });
          }
        }
      );
    });
  }

  /**
   * Retrieves the key set for the given key ID from Hydra,
   * then extract the public key and caches it in the map of keys.
   * @param {string} setId
   * @returns {Promise<string|DCDError>}
   */
  async getJWK(setId: string): Promise<string> {
    if (this.jwtTokenMap.includes(setId)) {
      return this.jwtTokenMap[setId];
    } else {
      // Not found, let's get it from keto
      try {
        const url = config.oauth2.oAuth2HydraAdminURL + "/keys/" + setId;
        const result = await this.authorisedRequest("GET", url);
        const jwk = result.keys[0];
        // Convert the JWK into a public key
        const publicKey = jwkToBuffer(jwk);
        this.jwtTokenMap[setId] = publicKey;
        return Promise.resolve(publicKey);
      } catch (error) {
        return Promise.reject(error);
      }
    }
  }

  async setJWK(setId: string, jwk: jwkToBuffer.JWK): Promise<jwkToBuffer.JWK> {
    const url = config.oauth2.oAuth2HydraAdminURL + "/keys/" + setId;
    try {
      const result = await this.authorisedRequest("PUT", url, { keys: [jwk] });
      const createdJWK: jwkToBuffer.JWK = result.keys[0];
      // Convert the JWK into a public key, and store it for later use
      this.jwtTokenMap[setId] = jwkToBuffer(createdJWK);
      return Promise.resolve(createdJWK);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async setPEM(setId: string, pem: string): Promise<jwkToBuffer.JWK> {
    try {
      const result = await JWK.createKeyStore().add(pem, "pem");
      return await this.setJWK(setId, result.toJSON() as jwkToBuffer.JWK);
    } catch (error) {
      return await Promise.reject(error);
    }
  }

  /**
   * Check JWK cache, fetch it
   * @param token
   * @param entity
   */
  async checkJWTAuth(token: string, thingId: string): Promise<User> {
    Log.debug("check JWT auth");
    // Public keys are cached by thingId, we check if this one is cached
    let publicKey = null;
    try {
      publicKey = await this.getJWK(thingId);
    } catch (error) {
      return Promise.reject(new DCDError(404, "Unknown key set"));
    }
    const options: jwt.VerifyOptions = {
      audience: config.http.url,
      subject: thingId,
      issuer: thingId,
      clockTimestamp: Math.floor(new Date().getMilliseconds() / 1000),
      clockTolerance: 5,
    };
    Log.debug("options: " + JSON.stringify(options));
    Log.debug(token.toString());
    jwt.verify(
      token.toString(),
      publicKey,
      options,
      // introspectionToken (type Token) can be used as second parameter.
      (error: Error) => {
        if (error) {
          Log.error(error)
          return Promise.reject(new DCDError(403, error.message));
        } else {
          return Promise.resolve({
            entityId: thingId,
            token: token,
            sub: thingId,
            token_type: "jwt",
          });
        }
      }
    );
  }

  refreshTokenIfExpired(): Promise<void> {
    if (this.token) {
      if (this.token.expired()) {
        return this.requestNewToken();
      }
      return Promise.resolve();
    }
    return this.requestNewToken();
  }

  async requestNewToken(): Promise<void> {
    try {
      const result = await this.oauth2.getToken({
        scope: config.oauth2.oAuth2Scope,
      });
      this.token = this.oauth2.createToken(result);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  getBearer(): string {
    return "bearer " + qs.escape(this.token.token.access_token);
  }

  /**
   * Build HTTP request with token and return the result.
   * @param {String} method
   * @param {String} url
   * @param {Object} body (optional)
   * @param {String} type (default: application/json)
   * @returns {Promise}
   */
  private async authorisedRequest(
    method: string,
    url: string,
    body: Record<string, unknown> = null,
    type = "application/json"
  ) {
    try {
      // Ensure a valid token before building the request
      await this.refreshTokenIfExpired();
      const options: RequestInit = {
        headers: {
          Authorization: this.getBearer(),
          "Content-Type": type,
          Accept: "application/json",
        },
        method: method,
        timeout: 15000,
      };
      if (config.http.secured) {
        options.headers["X-Forwarded-Proto"] = "https";
      }
      if (body !== null) {
        let bodyStr = "";
        if (type === "application/x-www-form-urlencoded") {
          bodyStr = qs.stringify(body as qs.ParsedUrlQueryInput);
        } else {
          bodyStr = JSON.stringify(body);
        }
        options.headers["Content-Length"] = bodyStr.length;
        options.body = bodyStr;
      }
      const result = await fetch(url, options);
      if (result.ok) {
        return result.json();
      }
      return Promise.reject(new DCDError(result.status, result.statusText));
    } catch (error) {
      return Promise.reject(error);
    }
  }
}
