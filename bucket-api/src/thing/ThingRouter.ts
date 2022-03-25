import { Application, Router } from "express";

import { AuthController } from "../auth/AuthController";
import { PolicyController } from "../policy/PolicyController";
import { PropertyRouter } from "./property/PropertyRouter";

import { ThingController } from "./ThingController";
import { DPiRouter } from "./dpi/DPiRouter";
import config from "../config";
import { GrafanaRouter } from "./grafana/GrafanaRouter";

export class ThingRouter {
  private router: Router;

  private controller: ThingController;
  private policyController: PolicyController;
  private authController: AuthController;

  private app: Application;
  private propertyRouter: PropertyRouter;
  private dpiRouter: DPiRouter;
  private grafanaRouter: GrafanaRouter;

  constructor(app: Application) {
    this.app = app;
    this.router = Router({ mergeParams: true });
    this.controller = ThingController.getInstance();
    this.policyController = PolicyController.getInstance();
    this.authController = AuthController.getInstance();
    this.setRoutes();
  }

  getRouter(): Router {
    return this.router;
  }

  getController(): ThingController {
    return this.controller;
  }

  setRoutes(): void {
    /**
     * @api {get} /things/health Health
     * @apiName GetAPIHealth
     * @apiVersion 0.1.5
     * @apiGroup Thing
     * @apiPermission none
     *
     * @apiDescription This APIGet Health status of Things API
     *
     * @apiSuccess {object} health status
     **/
    this.router.get(
      "/health",
      this.controller.getAPIHealth.bind(this.controller)
    );

    /**
     * @api {get} /things List
     * @apiVersion 0.1.5
     * @apiName GetThingsOfAPerson
     * @apiGroup Thing
     * @apiPermission dcd:things
     *
     * @apiDescription Get Things of a Person.
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiSuccess {Thing[]} things The retrieved Things
     * 
     * @apiUse DCDError
     **/
    this.router.get(
      "/",
      [this.authController.authenticate(["dcd:things"])],
      this.controller.getThingsOfAPerson.bind(this.controller)
    );

    /**
     * @api {get} /things/count Count Data Points
     * @apiVersion 0.1.5
     * @apiName CountDataPoints
     * @apiGroup Thing
     * @apiPermission dcd:things
     *
     * @apiDescription Count the data points of owned Things.
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiSuccess {Thing[]} things The retrieved Things with count for each Property.
     * 
     * @apiUse DCDError
     **/
    this.router.get(
      "/count",
      [this.authController.authenticate(["dcd:things"])],
      this.controller.countDataPoints.bind(this.controller)
    );

    /**
     * @api {get} /things/:thingId Read
     * @apiVersion 0.1.5
     * @apiName GetOneThingById
     * @apiGroup Thing
     * @apiPermission dcd:things
     *
     * @apiDescription Get one Thing.
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiParam {String} thingId Id of the Thing to read.
     *
     * @apiSuccess {object} thing The retrieved Thing
     * 
     * @apiUse DCDError
     **/
    this.router.get(
      "/:thingId",
      [
        this.authController.authenticate(["dcd:things"]),
        this.policyController.checkPolicy("read"),
      ],
      this.controller.getOneThingById.bind(this.controller)
    );

    /**
     * @api {post} /things Create
     * @apiVersion 0.1.5
     * @apiName CreateNewThing
     * @apiGroup Thing
     * @apiPermission dcd:things
     *
     * @apiDescription Create a new Thing.
     * 
     * @apiParam (Body) {String} name Thing name
     * @apiParam (Body) {String} description Thing description
     * @apiParam (Body) {String} type Thing type
     * @apiParam (Body) {String} [pem] Thing PEM
     * 
     * @apiParamExample {json} thing:
     *     {
     *       "name": "My Thing",
     *       "description": "A description of my thing.",
     *       "type": "Test Thing",
     *       "pem": "PEM PUBLIC KEY"
     *     }
     *
     * @apiHeader {String} Content-Type=application/json
     * @apiHeader {String} Authorization Bearer token obtained through the OAuth2 Authentication.
     * 
     * 
     * @apiExample {bash} Curl example
     * curl --request POST 'https://dwd.tudelft.nl/bucket/api/things'
     *      --header 'Authorization: Bearer REPLACE-BY-TOKEN' \
     *      --header 'Content-Type: application/json' \
     *      --data-raw '{
     *          "name": "Test token thing",
     *          "type": "Test",
     *          "description": "Test token thing"
     *      }'
     *
     * @apiExample {python} Python example
     * import requests
     * import json
     * 
     * url = "https://dwd.tudelft.nl/bucket/api/things"
     *
     * payload = json.dumps({
     *   "name": "Test token thing",
     *   "type": "Test",
     *   "description": "Test token thing"
     * })
     * headers = {
     *   'Authorization': 'Bearer REPLACE-BY-TOKEN',
     *   'Content-Type': 'application/json'
     * }
     * 
     * response = requests.request("POST", url, headers=headers, data=payload)
     * 
     * print(response.text)
     * 
     * @apiSuccess {object} thing The created Thing
     * 
     * @apiUse DCDError
     **/
    this.router.post(
      "/",
      [this.authController.authenticate(["dcd:things"])],
      this.controller.createNewThing.bind(this.controller)
    );

    /**
     * @api {patch} /things/:thingId Update
     * @apiVersion 0.1.5
     * @apiName EditThing
     * @apiGroup Thing
     * @apiPermission dcd:things
     *
     * @apiDescription Edit one Thing.
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiParam {String} thingId Id of the Thing to update.
     * 
     * @apiUse DCDError
     **/
    this.router.patch(
      "/:thingId",
      [
        this.authController.authenticate(["dcd:things"]),
        this.policyController.checkPolicy("update"),
      ],
      this.controller.editThing.bind(this.controller)
    );

    /**
     * @api {patch} /things/:thingId/pem Update PEM
     * @apiVersion 0.1.5
     * @apiName EditThingPEM
     * @apiGroup Thing
     * @apiPermission dcd:things
     *
     * @apiDescription Update the PEM file containing a public key, so that the Hub can identify a Thing as data transmitter.
     *
     * @apiHeader {string} Authorization TOKEN ID
     *
     * @apiParam (Path) {string} thingId Id of the Thing to update.
     *
     * @apiParam (Body) {string} thingId Id of the Thing to update.
     * @apiParam (Body) {string} pem of the Thing to update.
     * 
     * @apiUse DCDError
     **/
    this.router.patch(
      "/:thingId/pem",
      [
        this.authController.authenticate(["dcd:things"]),
        this.policyController.checkPolicy("update"),
      ],
      this.controller.editThingPEM.bind(this.controller)
    );

    /**
     * @api {delete} /things/:thingId Delete
     * @apiVersion 0.1.5
     * @apiName DeleteOneThing
     * @apiGroup Thing
     * @apiPermission dcd:things
     *
     * @apiDescription Delete one Thing.
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiParam {String} thingId Id of the Thing to delete.
     * 
     * @apiUse DCDError
     **/
    this.router.delete(
      "/:thingId",
      [
        this.authController.authenticate(["dcd:things"]),
        this.policyController.checkPolicy("delete"),
      ],
      this.controller.deleteOneThing.bind(this.controller)
    );


    this.router.get(
      "/things/takeout",
      [
        this.authController.authenticate(["dcd:things"]),
        this.policyController.checkPolicy("read"),
      ],
      this.controller.generateTakeOut.bind(this.controller)
    );

    // If there is a config for DPi, it means we should be able to use it!
    if (config.env.dpiUrl !== undefined && config.env.dpiUrl !== "") {
      this.dpiRouter = new DPiRouter(this.app);
      this.router.use("/:thingId/types/dpi", this.dpiRouter.getRouter());
    }

    this.propertyRouter = new PropertyRouter(this.app);
    this.router.use("/:thingId/properties", this.propertyRouter.getRouter());

    this.grafanaRouter = new GrafanaRouter(this.app);
    this.router.use("/:thingId/apps/grafana", this.grafanaRouter.getRouter());
  }
}
