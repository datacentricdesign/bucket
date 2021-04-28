import { Router } from "express";

import StravaController from "./StravaController";
import { introspectToken } from "../middlewares/introspectToken";
import { checkPolicy } from "../middlewares/checkPolicy";

import * as passport from 'passport'

import * as strategy from '@riderize/passport-strava-oauth2'
const StravaStrategy = strategy.Strategy;

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (obj, done) {
    done(null, obj);
});

passport.use(
    new StravaStrategy(
        {
            clientID: "65173",
            clientSecret: "00f9871d91cd2d8b3781de0558240778305ece12",
            callbackURL: "http://localhost:4000/auth/strava/callback",
        },
        async function (accessToken, refreshToken, profile, done) {
            return done(null, profile);
        }
    )
);

export const StravaRouter = Router({ mergeParams: true });

/**
 * @api {get} /
 * @apiGroup Strava
 * @apiDescription 
 *
 * @apiVersion 0.0.1
**/
// StravaRouter.get(
//     "/",
//     [introspectToken(['dcd:things'])],
//     StravaController.getProfile);

StravaRouter.get(
    "/auth",
    [introspectToken(['dcd:things'])],
    passport.authenticate('strava', {
        scope: ['profile:read_all,activity:read_all'],
    }))

StravaRouter.get(
    "/auth/callback",
    [introspectToken(['dcd:things'])],
    passport.authenticate('strava', {
        failureRedirect: '/login',
        successRedirect: '/',
    }))

StravaRouter.get(
    "/activities",
    [introspectToken(['dcd:things'])],
    StravaController.syncActivities);

// StravaRouter.get(
//     "/activities",
//     [introspectToken(['dcd:things'])],
//     StravaController.syncStreams)
