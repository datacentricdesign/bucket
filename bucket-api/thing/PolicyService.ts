import { getRepository } from "typeorm";
import { httpConfig } from "../config/httpConfig"
import { DCDError } from "../types/DCDError"

import fetch, { Response } from 'node-fetch';
import { authConfig } from "../config/authConfig";
import { Role } from "./role/Role";

import { v4 as uuidv4 } from 'uuid';

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
    const roleRepository = getRepository(Role);
    const newRole: Role = {
      id: id !== undefined ? id : uuidv4(),
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
      id: id,
      effect: effect,
      actions: roleToActions(roleName),
      subjects: [subjectId],
      resources: entityToResource(resourceId)
    }
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
    const url = authConfig.acpURL.href + '/engines/acp/ory/regex/allowed'
    const options = {
      headers: this.ketoHeaders,
      method: 'POST',
      body: JSON.stringify(acp)
    }
    try {
      const res = await fetch(url, options);
      if (res.ok) {
        const json:any = res.json();
        if (!json.allowed) {
          return Promise.reject(new DCDError(403, 'Request was not allowed'));
        }
      }
      const body = await Promise.reject(new DCDError(res.status, res.statusText));
      
      return Promise.resolve(body);
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
  async updateKetoPolicy(policy: any): Promise<Response> {
    try {
      const result = await fetch(authConfig.acpURL.href + 'engines/acp/ory/regex/policies', {
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

  async deleteKetoPolicy(policyId: string) {
    try {
      const result = await fetch(authConfig.acpURL.href + 'engines/acp/ory/regex/policies/' + policyId, {
        headers: this.ketoHeaders,
        method: 'DELETE'
      });
      return Promise.resolve(result);
    }
    catch (error) {
      return Promise.reject(new DCDError(403, 'Not allowed: ' + error.message));
    }
  }
}

const roleToActions = (role: string) => {
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
      return ['dcd:actions:create', 'dcd:actions:read', 'dcd:actions:update']
    default:
      return []
  }
}

const entityToResource = entityId => {
  if (entityId === 'dcd') {
    return ['dcd:things', 'dcd:persons']
  }
  return [
    entityId,
    entityId + ':properties',
    entityId + ':properties:<.*>',
    entityId + ':interactions',
    entityId + ':interactions:<.*>'
  ]
}
