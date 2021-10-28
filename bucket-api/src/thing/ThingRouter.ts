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
     * @api {get} /things/health
     * @apiGroup Thing
     * @apiDescription Get Health status of Things API
     *
     * @apiVersion 0.1.3
     *
     * @apiSuccess {object} health status
     **/
    this.router.get("/health", this.controller.apiHealth.bind(this.controller));

    /**
     * @api {get} /things List
     * @apiGroup Thing
     * @apiDescription Get Things of a Person.
     *
     * @apiVersion 0.1.3
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiSuccess {object} things The retrieved Things
     **/
    this.router.get(
      "/",
      [this.authController.authenticate(["dcd:things"])],
      this.controller.getThingsOfAPerson.bind(this.controller)
    );

    this.router.get(
      "/count",
      [this.authController.authenticate(["dcd:things"])],
      this.controller.countDataPoints.bind(this.controller)
    );

    /**
     * @api {get} /things/:thingId Read
     * @apiGroup Thing
     * @apiDescription Get one Thing.
     *
     * @apiVersion 0.1.3
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiParam {String} thingId Id of the Thing to read.
     *
     * @apiSuccess {object} thing The retrieved Thing
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
     * @apiGroup Thing
     * @apiDescription Create a new Thing.
     *
     * @apiVersion 0.1.3
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
    this.router.post(
      "/",
      [this.authController.authenticate(["dcd:things"])],
      this.controller.createNewThing.bind(this.controller)
    );

    /**
     * @api {patch} /things/:thingId Update
     * @apiGroup Thing
     * @apiDescription Edit one Thing.
     *
     * @apiVersion 0.1.3
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiParam {String} thingId Id of the Thing to update.
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
     * @apiGroup Thing
     * @apiDescription Update the PEM file containing a public key, so that the Hub can identify a Thing as data transmitter.
     *
     * @apiVersion 0.1.3
     *
     * @apiHeader {string} Authorization TOKEN ID
     *
     * @apiParam (Path) {string} thingId Id of the Thing to update.
     *
     * @apiParam (Body) {string} thingId Id of the Thing to update.
     * @apiParam (Body) {string} pem of the Thing to update.
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
     * @apiGroup Thing
     * @apiDescription Delete one Thing.
     *
     * @apiVersion 0.1.3
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiParam {String} thingId Id of the Thing to delete.
     **/
    this.router.delete(
      "/:thingId",
      [
        this.authController.authenticate(["dcd:things"]),
        this.policyController.checkPolicy("delete"),
      ],
      this.controller.deleteOneThing.bind(this.controller)
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
