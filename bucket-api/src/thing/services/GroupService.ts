import config from "../../config";
import { DCDError } from "@datacentricdesign/types";
import fetch from "node-fetch";
import { httpConfig } from "../../config/httpConfig";

/**
 * Manage groups for sharing entities.
 */
export class GroupService {
  private static instance: GroupService;

  public static getInstance(): GroupService {
    if (typeof GroupService.instance === "undefined") {
      GroupService.instance = new GroupService();
    }
    return GroupService.instance;
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
   *
   */
  async checkGroupMembership(
    member: string,
    groupId: string,
    flavor = "exact"
  ): Promise<void> {
    const url = `${config.oauth2.acpURL.origin}/engines/acp/ory/${flavor}/roles?member=${member}`;
    try {
      const res = await fetch(url, {
          headers: this.ketoHeaders,
          method: "GET",
        }),
        groups = await res.json();
      for (const group of groups) {
        if (group.id === groupId) {
          return Promise.resolve();
        }
      }
      return Promise.reject(
        new DCDError(4030, `${member} is not member of the group ${groupId}.`)
      );
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   *
   */
  async listGroupMembership(
    member: string,
    flavor = "exact"
  ): Promise<string[]> {
    const url = `${config.oauth2.acpURL.origin}/engines/acp/ory/${flavor}/roles?member=${member}`;
    try {
      const res = await fetch(url, {
          headers: this.ketoHeaders,
          method: "GET",
        }),
        resultJson = await res.json(),
        groups = [];
      for (let index = 0; index < resultJson.length; index += 1) {
        groups.push(resultJson[index].id);
      }
      return groups;
    } catch (error) {
      return Promise.reject(error);
    }
  }
}
