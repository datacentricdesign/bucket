import fetch from "node-fetch"
import config from "../../config"
import { AuthController } from "../http/AuthController"
import ThingController from "../http/ThingController"
import { Property } from "../property/Property"
import PropertyController from "../property/PropertyController"

import * as express from 'express'
import * as passport from 'passport'

import * as strategy from '@riderize/passport-strava-oauth2'
import { PropertyService } from "../property/PropertyService"
import { ThingService } from "../services/ThingService"
import { DTOProperty } from "@datacentricdesign/types"
const StravaStrategy = strategy.Strategy;

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (obj, done) {
    done(null, obj);
});

const STRAVA_API = 'https://www.strava.com/api/v3'

export class StravaService {

    async createProperties(thingId: string) {
        const activityProp: DTOProperty = {
            typeId: 'STRAVA_ACTIVITY'
        }
        await PropertyController.propertyService.createNewProperty(thingId, activityProp)
        const streamProp: DTOProperty = {
            typeId: 'STRAVA_STREAM'
        }
        await PropertyController.propertyService.createNewProperty(thingId, streamProp)
    }

    async syncActivities(token: string, property: Property) {
        // let jsonActivities = []
        // return StravaService.propertyService.lastDataPoints(property.thing.id, property.id)
        //     .then((values: Array<number>) => {
        //         let url = STRAVA_API + '/athlete/activities'
        //         if (values.length > 0) {
        //             url += '?after=' + Math.ceil(values[0] / 1000)
        //         }
        //         const options = {
        //             method: 'GET',
        //             headers: {
        //                 'Authorization': 'Bearer ' + token
        //             }
        //         }
        //         return fetch(url, options)
        //     })
        //     .then(result => {
        //         jsonActivities = result.json()
        //     }).then(() => {
        //         property.values = activitiesToValues(jsonActivities)
        //         return StravaService.propertyService.updatePropertyValues(property)
        //     }).then(() => {
        //         for (let index in jsonActivities) {
        //             this.syncStreams(token, streamProperty, jsonActivities[index].id)
        //         }
        //         Promise.all().then
        //     })
    }

    async syncStreams(token, property: Property, activity) {
        const url = STRAVA_API + '/activities/' + activity + '/streams?keys=distance,latlng,altitude,velocity_smooth,heartrate,cadence,watts,temp,moving,grade_smooth&key_by_type=true&series_type=time'
        const options = {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }
        const result = await fetch(url, options)
        return await result.json()
    }
}
