import { Router } from "express";

import { introspectToken } from "../middlewares/introspectToken";
import { checkPolicy } from "../middlewares/checkPolicy";
import { PropertyRouter } from '../property/PropertyRouter';

import ThingController from "./ThingController";
import { DPiRouter } from "../dpi/DPiRouter";
import config from "../../config";
import { GrafanaRouter } from "../grafana/GrafanaRouter";

export const ThingRouter = Router();

/**
     * @api {get} /things/health
     * @apiGroup Thing
     * @apiDescription Get Health status of Things API
     *
     * @apiVersion 0.1.1
     *
     * @apiSuccess {object} health status
**/
ThingRouter.get(
     "/health",
     ThingController.apiHealth);

/**
     * @api {get} /things List
     * @apiGroup Thing
     * @apiDescription Get Things of a Person.
     *
     * @apiVersion 0.1.1
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiSuccess {object} things The retrieved Things
**/
ThingRouter.get(
     "/",
     [introspectToken(['dcd:things'])],
     ThingController.getThingsOfAPerson);


ThingRouter.get(
     "/count",
     [introspectToken(['dcd:things'])],
     ThingController.countDataPoints);

/**
     * @api {get} /things/:thingId Read
     * @apiGroup Thing
     * @apiDescription Get one Thing.
     *
     * @apiVersion 0.1.1
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiParam {String} thingId Id of the Thing to read.
     *
     * @apiSuccess {object} thing The retrieved Thing
     **/
ThingRouter.get(
     "/:thingId",
     [introspectToken(['dcd:things']), checkPolicy('read')],
     ThingController.getOneThingById
);

/**
     * @api {post} /things Create
     * @apiGroup Thing
     * @apiDescription Create a new Thing.
     *
     * @apiVersion 0.1.1
     *
     * @apiParam (Body) {Thing} thing Thing to create as JSON.
     * @apiParamExample {json} thing:
     *     {
     *       "name": "My Thing",
     *       "description": "A description of my thing.",
     *       "type": "Test Thing",
     *       "pem": "PEM PUBLIC KEY"
     *     }
     *
     * @apiParam (Query) {Boolean} [jwt=false] Need to generate a JWT
     * @apiParam (Query) {Boolean} [thingId] Forward to update (Web forms cannot submit PUT methods)
     *
     * @apiHeader {String} Content-type application/json
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiSuccess {object} thing The created Thing
     **/
ThingRouter.post(
     "/",
     [introspectToken(['dcd:things'])],
     ThingController.createNewThing);

/**
     * @api {patch} /things/:thingId Update
     * @apiGroup Thing
     * @apiDescription Edit one Thing.
     *
     * @apiVersion 0.1.1
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiParam {String} thingId Id of the Thing to update.
**/
ThingRouter.patch(
     "/:thingId",
     [introspectToken(['dcd:things']), checkPolicy('update')],
     ThingController.editThing
);

/**
     * @api {patch} /things/:thingId/pem Update PEM
     * @apiGroup Thing
     * @apiDescription Update the PEM file containing a public key, so that the Hub can identify a Thing as data transmitter.
     *
     * @apiVersion 0.1.1
     *
     * @apiHeader {string} Authorization TOKEN ID
     *
     * @apiParam (Path) {string} thingId Id of the Thing to update.
     *
     * @apiParam (Body) {string} thingId Id of the Thing to update.
     * @apiParam (Body) {string} pem of the Thing to update.
**/
ThingRouter.patch(
     "/:thingId/pem",
     [introspectToken(['dcd:things']), checkPolicy('update')],
     ThingController.editThingPEM
);

/**
     * @api {delete} /things/:thingId Delete
     * @apiGroup Thing
     * @apiDescription Delete one Thing.
     *
     * @apiVersion 0.1.1
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiParam {String} thingId Id of the Thing to delete.
**/
ThingRouter.delete(
     "/:thingId",
     [introspectToken(['dcd:things']), checkPolicy('delete')],
     ThingController.deleteOneThing
);

// If there is a config for DPi, it means we should be able to use it!
if (config.env.dpiUrl !== undefined && config.env.dpiUrl !== '') {
     ThingRouter.use("/:thingId/types/dpi", DPiRouter)
} 

ThingRouter.use("/:thingId/properties", PropertyRouter)

ThingRouter.use("/:thingId/apps/grafana", GrafanaRouter)