import { getRepository } from "typeorm";
import { httpConfig } from "../config/httpConfig";
import { DCDError } from "@datacentricdesign/types";

import fetch from "node-fetch";
import { Role } from "../thing/role/Role";

import { v4 as uuidv4 } from "uuid";
import config from "../config";
import { Log } from "../Logger";

export interface AccessControlPolicy {
  subjects: string[];
  actions: string[];
  resources: string[];
  effect: string;
  id: string;
  conditions?: Map<string, string>;
  description?: string;
}

export interface Policy {
  subject: string;
  action: string;
  resource: string;
}

/**
 * Manage access policies
 */
export class PolicyService {
  private static instance: PolicyService;

  public static getInstance(): PolicyService {
    if (PolicyService.instance === undefined) {
      PolicyService.instance = new PolicyService();
    }
    return PolicyService.instance;
  }

  private ketoHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  private constructor() {
    if (httpConfig.secured) {
      this.ketoHeaders["X-Forwarded-Proto"] = "https";
    }
  }

  /**
   * Grant a role on a resource entity to a subject entity
   * @param {string} subjectId
   * @param {string} resourceId
   * @param {string} roleName
   * returns Promise
   **/
  async grant(
    subjectId: string,
    resourceId: string,
    roleName: string
  ): Promise<void> {
    try {
      const policyId = await this.getRoleId(subjectId, resourceId, roleName);
      // There is an existing policy, let's update
      return this.createPolicy(
        subjectId,
        resourceId,
        roleName,
        "allow",
        policyId
      );
    } catch (error) {
      if (error.errorCode === 4041) {
        // No existing policy (Not found)
        return this.createPolicy(subjectId, resourceId, roleName, "allow");
      }
      return Promise.reject(error); // Otherwise, something went wrong
    }
  }

  /**
   * Revoke a role on a resource entity to a subject entity
   * @param {string} subjectId
   * @param {string} resourceId
   * @param {string} roleName
   * returns Promise
   **/
  async revoke(
    subjectId: string,
    resourceId: string,
    roleName: string
  ): Promise<void> {
    try {
      const policyId: string = await this.getRoleId(
        subjectId,
        resourceId,
        roleName
      );
      // There is an existing policy, let's update
      return this.createPolicy(
        subjectId,
        resourceId,
        roleName,
        "deny",
        policyId
      );
    } catch (error) {
      if (error.errorCode === 4041) {
        // No existing policy (Not found)
        return this.createPolicy(subjectId, resourceId, roleName, "deny");
      }
      return Promise.reject(error); // Otherwise, something went wrong
    }
  }

  async getRoleId(
    subjectId: string,
    resourceId: string,
    roleName: string
  ): Promise<string> {
    const roleRepository = getRepository(Role);
    try {
      const role: Role = await roleRepository.findOneOrFail({
        where: {
          actorEntityId: subjectId,
          subjectEntityId: resourceId,
          role: roleName,
        },
      });
      return role.id;
    } catch (error) {
      throw new DCDError(
        4041,
        "Role not found for " +
        subjectId +
        ", " +
        resourceId +
        " and " +
        roleName
      );
    }
  }

  async createPolicy(
    subjectId: string,
    resourceId: string,
    roleName: string,
    effect = "allow",
    id?: string
  ): Promise<void> {
    Log.debug("creating policy...");
    const policyId: string = id !== undefined ? id : uuidv4();
    const roleRepository = getRepository(Role);
    const newRole: Role = {
      id: policyId,
      actorEntityId: subjectId,
      subjectEntityId: resourceId,
      role: roleName,
    };

    try {
      await roleRepository.save(newRole);
    } catch (error) {
      return Promise.reject(error);
    }

    const policy = {
      id: policyId,
      effect: effect,
      actions: PolicyService.roleToActions(roleName),
      subjects: [subjectId],
      resources: PolicyService.entityToResource(resourceId),
    };
    Log.debug(JSON.stringify(policy));
    await this.updateKetoPolicy(policy);
  }

  async deletePolicy(
    subjectId: string,
    resourceId: string,
    roleName: string
  ): Promise<void> {
    try {
      const roleId: string = await this.getRoleId(
        subjectId,
        resourceId,
        roleName
      );
      // There is an existing policy, let's update
      const roleRepository = getRepository(Role);
      await roleRepository.delete(roleId);
      // Use the role id to retrieve and delete associated Keto's policy
      this.deleteKetoPolicy(roleId);
    } catch (error) {
      return Promise.reject(error); // Otherwise, something went wrong
    }
  }

  async check(acp: Policy): Promise<void> {
    const url = config.oauth2.acpURL.origin + "/engines/acp/ory/regex/allowed";
    const options = {
      headers: this.ketoHeaders,
      method: "POST",
      body: JSON.stringify(acp),
    };
    try {
      const res = await fetch(url, options);
      if (res.ok) {
        return Promise.resolve();
      }
      return Promise.reject(new DCDError(4031, "Request was not allowed"));
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async getTotalConsents(flavor) {
    const url = config.oauth2.acpURL.origin + "/engines/acp/ory/" + flavor + "/policies?limit=500&offset=";
    const options = {
      headers: this.ketoHeaders,
      method: "GET",
    };
    const fullList = []
    let lastResultSize = 500
    try {
      while (lastResultSize == 500) {
        const res = await fetch(url + fullList.length, options);
        if (res.ok) {
          let result = await res.json();
          if (result === null) {
            return fullList.length
          }
          lastResultSize = result.length
          fullList.push(result as AccessControlPolicy[])
        } else {
          return fullList.length;
        }
      }
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Get the list of consents that concern a subject, a resource or an action
   * @param type subject, resource, action
   * @param  id the id of the concerned subject, resource or action
   */
  async listConsents(
    type: string,
    id: string,
    flavor = "exact"
  ): Promise<AccessControlPolicy[]> {
    const totalConsents = await this.getTotalConsents(flavor);
    const url =
      config.oauth2.acpURL.origin +
      "/engines/acp/ory/" +
      flavor +
      "/policies?limit=500&" +
      type +
      "=" +
      id + "&offset=";
    const options = {
      headers: this.ketoHeaders,
      method: "GET",
    };
    try {
      const totalPages = Math.ceil(totalConsents/500);
      const totalResults = [];
      for(let i=0;i<totalPages;i++) {
        const res = await fetch(url+(i*500), options);
        if (res.ok) {
          let result = await res.json();
          console.log(result)
          if (result !== null) {
            totalResults.push(result);
          }
        }
        return Promise.resolve(totalResults as AccessControlPolicy[]);
      }
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async checkGroupMembership(
    member: string,
    groupId: string,
    flavor = "exact"
  ): Promise<void> {
    const url =
      config.oauth2.acpURL.origin +
      "/engines/acp/ory/" +
      flavor +
      "/roles?member=" +
      member;
    try {
      const res = await fetch(url, {
        headers: this.ketoHeaders,
        method: "GET",
      });
      const groups = await res.json();
      for (let i = 0; i < groups.length; i++) {
        if (groups[i].id === groupId) {
          return Promise.resolve();
        }
      }
      return Promise.reject(
        new DCDError(
          4030,
          member + " is not member of the group " + groupId + "."
        )
      );
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async listGroupMembership(
    member: string,
    flavor = "exact"
  ): Promise<string[]> {
    const url =
      config.oauth2.acpURL.origin +
      "/engines/acp/ory/" +
      flavor +
      "/roles?member=" +
      member;
    try {
      const res = await fetch(url, {
        headers: this.ketoHeaders,
        method: "GET",
      });
      const result_json = await res.json();
      const groups = [];
      for (let i = 0; i < result_json.length; i++) {
        groups.push(result_json[i].id);
      }
      return groups;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   *
   */
  async updateKetoPolicy(
    policy: AccessControlPolicy,
    flavor = "regex"
  ): Promise<AccessControlPolicy> {
    const url =
      config.oauth2.acpURL.origin + "/engines/acp/ory/" + flavor + "/policies";
    try {
      const result = await fetch(url, {
        headers: this.ketoHeaders,
        method: "PUT",
        body: JSON.stringify(policy),
      });
      const acp = await result.json();
      console.log(url)
      console.log(acp)
      return Promise.resolve(acp as AccessControlPolicy);
    } catch (error) {
      return Promise.reject(new DCDError(403, "Not allowed: " + error.message));
    }
  }

  async deleteKetoPolicy(policyId: string, flavor = "regex"): Promise<void> {
    try {
      await fetch(
        config.oauth2.acpURL.origin +
        "/engines/acp/ory/" +
        flavor +
        "/policies/" +
        policyId,
        {
          headers: this.ketoHeaders,
          method: "DELETE",
        }
      );
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(new DCDError(403, "Not allowed: " + error.message));
    }
  }

  static roleToActions(role: string): string[] {
    switch (role) {
      case "user":
        return ["dcd:actions:create", "dcd:actions:list"];
      case "reader":
        return ["dcd:actions:read", "dcd:actions:list"];
      case "owner":
        return [
          "dcd:actions:create",
          "dcd:actions:list",
          "dcd:actions:read",
          "dcd:actions:update",
          "dcd:actions:delete",
          "dcd:actions:grant",
          "dcd:actions:revoke",
        ];
      case "subject":
        return [
          "dcd:actions:create",
          "dcd:actions:read",
          "dcd:actions:update",
          "dcd:actions:log",
          "dcd:actions:reply",
        ];
      default:
        return [];
    }
  }

  static entityToResource(thingId: string): string[] {
    if (thingId === "dcd") {
      return ["dcd:things"];
    }
    return [thingId, thingId + ":properties", thingId + ":properties:<.*>"];
  }
}
