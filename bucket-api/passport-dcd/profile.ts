import { Profile, JSONProfile } from "../types";


/**
 * Parse profile.
 */
export const parseProfile = (json: JSONProfile) => {
    if ('string' === typeof json) {
      json = JSON.parse(json);
    }
  
    const profile: Profile = {};
    profile.id = String(json.id);
    profile.displayName = json.name;
    profile.username = json.login;
    profile.profileUrl = json.html_url;
    if (json.email) {
      profile.emails = [{value: json.email}];
    }
  
    return profile;
  };