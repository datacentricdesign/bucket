import { Router } from "express";

import introspectToken from "../middlewares/introspectToken";
import checkPolicy from "../middlewares/checkPolicy";
import PropertyRouter from "../property/PropertyRouter";

import DPiRouter from "../dpi/DPiRouter";
import config from "../../config";
import GrafanaRouter from "../grafana/GrafanaRouter";
import ThingController from "./ThingController";

class ThingRouter {
  private router: Router;

  private controller: ThingController;

  private propertyRouter: PropertyRouter;

  private grafanaRouter: GrafanaRouter;

  private dpiRouter: DPiRouter;

  constructor() {
    this.router = Router();
    this.controller = new ThingController();
    this.propertyRouter = new PropertyRouter();
    this.grafanaRouter = new GrafanaRouter();
    this.dpiRouter = new DPiRouter();
    this.setRoutes();
  }

  getRouter(): Router {
    return this.router;
  }

  getPropertyRouter(): PropertyRouter {
    return this.propertyRouter;
  }

  getDPiRouter(): DPiRouter {
    return this.dpiRouter;
  }

  setRoutes(): void {
    /**
     * @api {get} /things/health
     * @apiGroup Thing
     * @apiDescription Get Health status of Things API
     *
     * @apiVersion 0.1.0
     *
     * @apiSuccess {object} health status
     * */
    this.router.get("/health", this.controller.apiHealth);

    /**
     * @api {get} /things List
     * @apiGroup Thing
     * @apiDescription Get Things of a Person.
     *
     * @apiVersion 0.1.0
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiSuccess {object} things The retrieved Things
     * */
    this.router.get(
      "/",
      [introspectToken(["dcd:things"])],
      this.controller.getThingsOfAPerson
    );

    this.router.get(
      "/count",
      [introspectToken(["dcd:things"])],
      this.controller.countDataPoints
    );

    /**
     * @api {get} /things/:thingId Read
     * @apiGroup Thing
     * @apiDescription Get one Thing.
     *
     * @apiVersion 0.1.0
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiParam {String} thingId Id of the Thing to read.
     *
     * @apiSuccess {object} thing The retrieved Thing
     * */
    this.router.get(
      "/:thingId",
      [introspectToken(["dcd:things"]), checkPolicy("read")],
      this.controller.getOneThingById
    );

    /**
     * @api {post} /things Create
     * @apiGroup Thing
     * @apiDescription Create a new Thing.
     *
     * @apiVersion 0.1.0
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
     * */
    this.router.post(
      "/",
      [introspectToken(["dcd:things"])],
      this.controller.createNewThing
    );

    /**
     * @api {patch} /things/:thingId Update
     * @apiGroup Thing
     * @apiDescription Edit one Thing.
     *
     * @apiVersion 0.1.0
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiParam {String} thingId Id of the Thing to update.
     * */
    this.router.patch(
      "/:thingId",
      [introspectToken(["dcd:things"]), checkPolicy("update")],
      this.controller.editThing
    );

    /**
     * @api {patch} /things/:thingId/pem Update PEM
     * @apiGroup Thing
     * @apiDescription Update the PEM file containing a public key, so that the Hub can identify a Thing as data transmitter.
     *
     * @apiVersion 0.1.0
     *
     * @apiHeader {string} Authorization TOKEN ID
     *
     * @apiParam (Path) {string} thingId Id of the Thing to update.
     *
     * @apiParam (Body) {string} thingId Id of the Thing to update.
     * @apiParam (Body) {string} pem of the Thing to update.
     * */
    this.router.patch(
      "/:thingId/pem",
      [introspectToken(["dcd:things"]), checkPolicy("update")],
      this.controller.editThingPEM
    );

    /**
     * @api {delete} /things/:thingId Delete
     * @apiGroup Thing
     * @apiDescription Delete one Thing.
     *
     * @apiVersion 0.1.0
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiParam {String} thingId Id of the Thing to delete.
     * */
    this.router.delete(
      "/:thingId",
      [introspectToken(["dcd:things"]), checkPolicy("delete")],
      this.controller.deleteOneThing
    );

    // If there is a config for DPi, it means we should be able to use it!
    if (config.env.dpiUrl !== undefined && config.env.dpiUrl !== "") {
      this.router.use("/:thingId/types/dpi", this.dpiRouter.getRouter());
    }

    this.router.use("/:thingId/properties", this.propertyRouter.getRouter());

    this.router.use("/:thingId/apps/grafana", this.grafanaRouter.getRouter());
  }
}

export default ThingRouter;
