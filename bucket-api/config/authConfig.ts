
import {URL} from 'url'

export const authConfig: any = {
    oAuth2TokenURL: process.env.OAUTH2_TOKEN_URL,
    oAuth2RevokeURL: process.env.OAUTH2_REVOKE_URL,
    oAuth2AuthURL: process.env.OAUTH2_AUTH_URL,
    oAuth2RedirectURL: process.env.OAUTH2_REDIRECT_URL,
    oAuth2ProfileURL: process.env.OAUTH2_PROFILE_URL,
    oAuth2ClientId:process.env.OAUTH2_CLIENT_ID,
    oAuth2ClientSecret:process.env.OAUTH2_CLIENT_SECRET,
    oAuth2Scope: process.env.OAUTH2_SCOPE.split(" "),
    acpURL: new URL(process.env.ACP_URL)
};