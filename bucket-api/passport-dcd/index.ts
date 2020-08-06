
import config from "../config";
import * as session from 'express-session'
import * as passport from 'passport';
import { Strategy } from './strategy';
import * as refresh from 'passport-oauth2-refresh';
import { URL } from 'url';
import { Request, Response, Application, NextFunction } from "express";

export const setupPassport = (app: Application) => {
    const strategyOptions = {
        authorizationURL: config.oauth2.oAuth2AuthURL,
        tokenURL: config.oauth2.oAuth2TokenURL,
        clientID: config.oauth2.oAuth2ClientId,
        clientSecret: config.oauth2.oAuth2ClientSecret,
        callbackURL: config.oauth2.oAuth2RedirectURL,
        userProfileURL: config.oauth2.oAuth2ProfileURL,
        state: true,
        scope: ['offline', 'openid', 'profile', 'dcd:things', 'dcd:persons']
    };
    
    const strategy = new Strategy(strategyOptions,
        (accessToken: any,
        refreshToken: any,
        profile: any,
        cb: (arg0: any, arg1: { accessToken: any; profile: any; }) => any) => cb(null, { accessToken, profile })
    )

    passport.use('oauth2', strategy)
    refresh.use('oauth2', strategy)
    
    passport.serializeUser((user, done) => {
        done(null, JSON.stringify(user));
    });
    
    passport.deserializeUser((user: string, done) => {
        done(null, JSON.parse(user));
    });
    
    // These are middlewares required by passport js
    app.use(session({
        secret: 'keyboard cat',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }
    }));
    app.use(passport.initialize());
    app.use(passport.session());
    
    // Whenever the UI need to authenticate, trigger /auth
    app.get(config.http.baseUrl + '/auth', logMid(), passport.authenticate('oauth2'));
    
    const pathRedirect = new URL(config.oauth2.oAuth2RedirectURL).pathname

    // // When the OAuth2 dance is completed, redirect to the original UI URL
    app.get("", passport.authenticate('oauth2',
        { failureRedirect: '/auth', failWithError: true }),
        (req: Request, res: Response) => {
            // After success, redirect to the page we came from originally
            console.log('/auth/callback ' + req['session'].redirectTo);
            res.redirect(req['session'].redirectTo);
        }
    );
}

const logMid = () => {
    return async (req: Request, res: Response, next: NextFunction) => {
        console.log('knowcking at auth')
        next()
    }
}