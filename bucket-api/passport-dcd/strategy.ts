
/**
 * Module dependencies.
 */
import * as util from 'util'
import * as OAuth2Strategy from 'passport-oauth2'
import { parseProfile } from './profile'
import { InternalOAuthError }  from 'passport-oauth2'


/**
 * `Strategy` constructor.
 *
 * @param {Object} options
 * @param {Function} verify
 * @api public
 */
export function Strategy(options: any, verify: Function) {
  options = options || {};

  if (!options.userProfileURL) {
    throw new TypeError('OAuth 2.0-based strategy ' +
      'requires a userProfileURL option');
  }

  OAuth2Strategy.call(this, options, verify);
  this._userProfileURL = options.userProfileURL;
}

/**
 * Inherit from `OAuth2Strategy`.
 */
util.inherits(Strategy, OAuth2Strategy);


/**
 * Retrieve user profile.
 *
 * @param {String} accessToken
 * @param {Function} done
 * @api protected
 */
Strategy.prototype.userProfile = function (accessToken: string, done: Function) {
  this._oauth2.get(this._userProfileURL, accessToken, function (err, body) {
    // We can read the response in the 3rd param
    let json;

    if (err) {
      return done(new InternalOAuthError('Failed to fetch user profile', err));
    }

    try {
      json = JSON.parse(body);
    } catch (ex) {
      return done(new Error('Failed to parse user profile'));
    }

    const profile = parseProfile(json);
    profile._raw = body;
    profile._json = json;
    profile.token = accessToken;
    profile.id = json.sub;

    done(null, profile);
  });
};
