import fetch, { Response } from "node-fetch";
import config from "../../config";
import { DCDError } from "@datacentricdesign/types";
import { getRepository } from "typeorm";
import { httpConfig } from "../../config/httpConfig";
import { Role } from "../role/Role";
import { v4 as uuidv4 } from "uuid";

export interface AccessControlPolicy {
  id: string;
  description?: string;
  effect: string;
  actions: string[];
  subjects: string[];
  resources: string[];
  conditions?: Record<string, unknown>;
}

export interface Access {
  token?: string;
  resource: string;
  action: string;
  subject: string;
}

export interface Policy {
  effect: "allow" | "deny";
  id?: string;
  resourceId: string;
  roleName: string;
  subjectId: string;
}

/**
 * Manage access control policies
 */
export class PolicyService {
  private static instance: PolicyService;

  public static getInstance(): PolicyService {
    if (typeof PolicyService.instance === "undefined") {
      PolicyService.instance = new PolicyService();
    }
    return PolicyService.instance;
  }

  private ketoHeaders = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  constructor() {
    if (httpConfig.secured) {
      this.ketoHeaders["X-Forwarded-Proto"] = "https";
    }
  }

  /**
   * Grant a role on a resource entity to a subject entity.
   */
  async grant(
    subjectId: string,
    resourceId: string,
    roleName: string
  ): Promise<AccessControlPolicy> {
    try {
      const policyId = await PolicyService.getRoleId(
        subjectId,
        resourceId,
        roleName
      );
      // There is an existing policy, let's update
      return this.createPolicy({
        effect: "allow",
        id: policyId,
        resourceId,
        roleName,
        subjectId,
      });
    } catch (error) {
      if (error.errorCode === 4041) {
        // No existing policy (Not found)
        return this.createPolicy({
          effect: "allow",
          resourceId,
          roleName,
          subjectId,
        });
      }
      // Otherwise, something went wrong
      return Promise.reject(error);
    }
  }

  /**
   * Revoke a role on a resource entity to a subject entity.
   */
  async revoke(
    subjectId: string,
    resourceId: string,
    roleName: string
  ): Promise<AccessControlPolicy> {
    try {
      const policyId: string = await PolicyService.getRoleId(
        subjectId,
        resourceId,
        roleName
      );
      // There is an existing policy, let's update
      return this.createPolicy({
        effect: "deny",
        id: policyId,
        resourceId,
        roleName,
        subjectId,
      });
    } catch (error) {
      if (error.errorCode === 4041) {
        // No existing policy (Not found)
        return this.createPolicy({
          effect: "deny",
          resourceId,
          roleName,
          subjectId,
        });
      }
      // Otherwise, something went wrong
      return Promise.reject(error);
    }
  }

  /**
   * Provides the role id for a given triple subject/resource/role.
   */
  static async getRoleId(
    subjectId: string,
    resourceId: string,
    roleName: string
  ): Promise<string> {
    const roleRepository = getRepository(Role);
    try {
      const role: Role = await roleRepository.findOneOrFail({
        where: {
          actorEntityId: subjectId,
          role: roleName,
          subjectEntityId: resourceId,
        },
      });
      return Promise.resolve(role.id);
    } catch (error) {
      return Promise.reject(
        new DCDError(
          4041,
          `Role not found for ${subjectId}, ${resourceId} and ${roleName}`
        )
      );
    }
  }

  /**
   *
   */
  async createPolicy(policy: Policy): Promise<AccessControlPolicy> {
    let policyId: string = policy.id;
    if (typeof policyId === "undefined") {
      policyId = uuidv4();
    }
    const newRole: Role = {
      actorEntityId: policy.subjectId,
      id: policyId,
      role: policy.roleName,
      subjectEntityId: policy.resourceId,
    };

    try {
      const roleRepository = getRepository(Role);
      await roleRepository.save(newRole);
    } catch (error) {
      return Promise.reject(error);
    }

    const acp: AccessControlPolicy = {
      actions: PolicyService.roleToActions(policy.roleName),
      effect: policy.effect,
      id: policyId,
      resources: PolicyService.entityToResource(policy.resourceId),
      subjects: [policy.subjectId],
    };
    return this.updateKetoPolicy(acp);
  }

  /**
   *
   */
  async deletePolicy(
    subjectId: string,
    resourceId: string,
    roleName: string
  ): Promise<Response> {
    try {
      const roleId: string = await PolicyService.getRoleId(
          subjectId,
          resourceId,
          roleName
        ),
        // There is an existing policy, let's update
        roleRepository = getRepository(Role);
      await roleRepository.delete(roleId);
      // Use the role id to retrieve and delete associated Keto's policy
      return this.deleteKetoPolicy(roleId);
    } catch (error) {
      // Otherwise, something went wrong
      return Promise.reject(error);
    }
  }

  /**
   *
   */
  async check(acp: Access): Promise<void> {
    const url = `${config.oauth2.acpURL.origin}/engines/acp/ory/regex/allowed`;
    try {
      const res = await fetch(url, {
        body: JSON.stringify(acp),
        headers: this.ketoHeaders,
        method: "POST",
      });
      if (res.ok) {
        return Promise.resolve();
      }
      return Promise.reject(new DCDError(4031, "Request was not allowed"));
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
    type: "resource" | "subject" | "action",
    id: string,
    flavor: "exact" | "regex" = "exact"
  ): Promise<AccessControlPolicy[]> {
    const url = `${config.oauth2.acpURL.origin}/engines/acp/ory/${flavor}/policies?limit=100000&${type}=${id}`;
    try {
      const res = await fetch(url, {
        headers: this.ketoHeaders,
        method: "GET",
      });
      if (res.ok) {
        let result = await res.json();
        if (result === null) {
          result = [];
        }
        return Promise.resolve(result);
      }
      if (res.status === 403) {
        return Promise.reject(new DCDError(403, "Request was not allowed."));
      } else if (res.status === 404) {
        return Promise.reject(new DCDError(404, "Resource not found."));
      }
      return Promise.reject(new DCDError(res.status, "Server error."));
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
    const url = `${config.oauth2.acpURL.origin}/engines/acp/ory/${flavor}/policies`;
    try {
      const result = await fetch(url, {
        body: JSON.stringify(policy),
        headers: this.ketoHeaders,
        method: "PUT",
      });
      return Promise.resolve(<AccessControlPolicy>await result.json());
    } catch (error) {
      return Promise.reject(new DCDError(403, `Not allowed: ${error.message}`));
    }
  }

  /**
   *
   */
  async deleteKetoPolicy(
    policyId: string,
    flavor = "regex"
  ): Promise<Response> {
    return fetch(
      `${config.oauth2.acpURL.origin}/engines/acp/ory/${flavor}/policies/${policyId}`,
      {
        headers: this.ketoHeaders,
        method: "DELETE",
      }
    ).catch((error) => {
      return Promise.reject(new DCDError(403, `Not allowed: ${error.message}`));
    });
  }

  /**
   *
   */
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
    return [thingId, `${thingId}:properties`, `${thingId}:properties:<.*>`];
  }
}
