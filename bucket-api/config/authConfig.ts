
import {URL} from 'url'

export const authConfig: any = {
    oAuth2TokenURL: new URL(process.env.OAUTH2_TOKEN_URL),
    oAuth2RevokeURL: new URL(process.env.OAUTH2_REVOKE_URL),
    oAuth2IntrospectURL: new URL(process.env.OAUTH2_INTROSPECT_URL),
    oAuth2ClientId:process.env.OAUTH2_CLIENT_ID,
    oAuth2ClientSecret:process.env.OAUTH2_CLIENT_SECRET,
    oAuth2Scope: process.env.OAUTH2_SCOPE,
    acpURL: new URL(process.env.ACP_URL)
};