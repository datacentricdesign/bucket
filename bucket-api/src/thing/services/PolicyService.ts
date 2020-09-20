import { getRepository } from "typeorm";
import { httpConfig } from "../../config/httpConfig"
import { DCDError } from "@datacentricdesign/types"

import fetch, { Response } from 'node-fetch';
import { Role } from "../role/Role";

import { v4 as uuidv4 } from 'uuid';
import config from "../../config";
import { Log } from "../../Logger";

/**
 * Manage access policies
 */
export class PolicyService {

  private ketoHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }

  /**
   *
   */
  constructor() {
    if (httpConfig.secured) {
      this.ketoHeaders['X-Forwarded-Proto'] = 'https'
    }
  }

  /**
   * Grant a role on a resource entity to a subject entity
   * @param {string} subjectId
   * @param {string} resourceId
   * @param {string} roleName
   * returns Promise
   **/
  async grant(subjectId: string, resourceId: string, roleName: string) {
    try {
      const policyId = await this.getRoleId(subjectId, resourceId, roleName);
      // There is an existing policy, let's update
      return this.createPolicy(subjectId, resourceId, roleName, 'allow', policyId);
    }
    catch (error) {
      if (error.errorCode === 4041) {
        // No existing policy (Not found)
        return this.createPolicy(subjectId, resourceId, roleName, 'allow');
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
  async revoke(subjectId: string, resourceId: string, roleName: string): Promise<any> {
    try {
      const policyId:string = await this.getRoleId(subjectId, resourceId, roleName);
      // There is an existing policy, let's update
      return this.createPolicy(subjectId, resourceId, roleName, 'deny', policyId);
    }
    catch (error) {
      if (error.errorCode === 4041) {
        // No existing policy (Not found)
        return this.createPolicy(subjectId, resourceId, roleName, 'deny');
      }
      return Promise.reject(error); // Otherwise, something went wrong
    }
  }

  async getRoleId(subjectId: string, resourceId: string, roleName: string): Promise<string> {
    const roleRepository = getRepository(Role);
    try {
      const role: Role = await roleRepository.findOneOrFail({
        where: {
          actorEntityId: subjectId,
          subjectEntityId: resourceId,
          role: roleName
        }
      })
      return role.id;
    } catch(error) {
      throw new DCDError(4041, 'Role not found for ' + subjectId +
      ', ' + resourceId +
      ' and ' + roleName)
    }
  }


  async createPolicy(subjectId: string, resourceId: string, roleName: string, effect = 'allow', id?: string) {
    Log.debug("creating policy...")
    const policyId: string = id !== undefined ? id : uuidv4()
    const roleRepository = getRepository(Role);
    const newRole: Role = {
      id: policyId,
      actorEntityId: subjectId,
      subjectEntityId: resourceId,
      role: roleName
    }

    try {
      await roleRepository.save(newRole);
    } catch(error) {
      return Promise.reject(error)
    }

    const policy = {
      id: policyId,
      effect: effect,
      actions: PolicyService.roleToActions(roleName),
      subjects: [subjectId],
      resources: PolicyService.entityToResource(resourceId)
    }
    Log.debug(JSON.stringify(policy))
    return this.updateKetoPolicy(policy)
  }

  async deletePolicy(subjectId:string, resourceId:string, roleName:string) {
    try {
      const roleId:string = await this.getRoleId(subjectId, resourceId, roleName)
      // There is an existing policy, let's update
      const roleRepository = getRepository(Role);
      await roleRepository.delete(roleId);
      // Use the role id to retrieve and delete associated Keto's policy
      return this.deleteKetoPolicy(roleId)
    } catch(error) {
      return Promise.reject(error); // Otherwise, something went wrong
    }
  }

  async check(acp: any) {
    const url = config.oauth2.acpURL.origin + '/engines/acp/ory/regex/allowed'
    const options = {
      headers: this.ketoHeaders,
      method: 'POST',
      body: JSON.stringify(acp)
    }
    try {
      const res = await fetch(url, options);
      if (res.ok) {
        return Promise.resolve();
      }
      return Promise.reject(new DCDError(4031, 'Request was not allowed'));
    }
    catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Get the list of consents that concern a subject, a resource or an action
   * @param type subject, resource, action
   * @param  id the id of the concerned subject, resource or action
   */
  async listConsents(type:string, id: string) {
    const url = config.oauth2.acpURL.origin + '/engines/acp/ory/exact/policies?' + type + '=' + id
    const options = {
      headers: this.ketoHeaders,
      method: 'GET'
    }
    try {
      const res = await fetch(url, options);
      if (res.ok) {
        return Promise.resolve(res.json());
      }
      return Promise.reject(new DCDError(4031, 'Request was not allowed'));
    }
    catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * 
   * @param policy
   * @returns {Promise<Response>}
   */
  async updateKetoPolicy(policy: any, flavor:string = 'regex'): Promise<Response> {
    try {
      const result = await fetch(config.oauth2.acpURL.origin + '/engines/acp/ory/' + flavor + '/policies', {
        headers: this.ketoHeaders,
        method: 'PUT',
        body: JSON.stringify(policy)
      });
      return Promise.resolve(result);
    }
    catch (error) {
      return Promise.reject(new DCDError(403, 'Not allowed: ' + error.message));
    }
  }

  async deleteKetoPolicy(policyId: string, flavor:string = 'regex') {
    try {
      const result = await fetch(config.oauth2.acpURL.origin + '/engines/acp/ory/' + flavor + '/policies/' + policyId, {
        headers: this.ketoHeaders,
        method: 'DELETE'
      });
      return Promise.resolve(result);
    }
    catch (error) {
      return Promise.reject(new DCDError(403, 'Not allowed: ' + error.message));
    }
  }


  static roleToActions(role: string) {
  switch (role) {
    case 'user':
      return ['dcd:actions:create', 'dcd:actions:list']
    case 'reader':
      return ['dcd:actions:read', 'dcd:actions:list']
    case 'owner':
      return [
        'dcd:actions:create',
        'dcd:actions:list',
        'dcd:actions:read',
        'dcd:actions:update',
        'dcd:actions:delete',
        'dcd:actions:grant',
        'dcd:actions:revoke'
      ]
    case 'subject':
      return [
        'dcd:actions:create',
        'dcd:actions:read',
        'dcd:actions:update',
        'dcd:actions:log',
        'dcd:actions:reply']
    default:
      return []
  }
}

  static entityToResource(thingId:string) {
    if (thingId === 'dcd') {
      return ['dcd:things']
    }
    return [
      thingId,
      thingId + ':properties',
      thingId + ':properties:<.*>'
    ]
  }
}
