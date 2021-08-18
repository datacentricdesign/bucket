
import config from "../config";

import * as express from "express";
import { Request, Response, NextFunction } from "express";
import { Server } from "http"

import * as bodyParser from "body-parser";
import * as cookieParser from "cookie-parser";
import * as helmet from "helmet";
import * as cors from "cors";

import { AuthController } from "../auth/AuthController";
import PropertyController from "../thing/property/PropertyController";
import DPiController from "../thing/dpi/DPiController";
import { PropertyTypeRouter } from "../thing/property/propertyType/PropertyTypeRouter";
import { ThingRouter } from "../thing/ThingRouter";
import { Log } from "../Logger";
import { DCDError } from "@datacentricdesign/types";

export class HttpAPI {

  app: express.Application;
  server: Server;

  thingRouter: ThingRouter;
  propertyTypeRouter: PropertyTypeRouter;

  propertyController: PropertyController;
  authController: AuthController;
  dpiController: DPiController;

  constructor() {

    this.propertyController = PropertyController.getInstance();
    this.authController = AuthController.getInstance();

    // Create a new express application instance
    this.app = express();

    // Call middleware
    this.app.use(cors());
    this.app.use(helmet());
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: false }));
    this.app.use(cookieParser());

    this.app.get(config.http.baseUrl + "/", (req: Request, res: Response, next: NextFunction) => {
      return res.status(200).send({ "status": "OK" });
    });

    // Set all routes from routes folder
    this.thingRouter = new ThingRouter(this.app)
    this.app.use(config.http.baseUrl + "/things", this.thingRouter.getRouter());

    this.dpiController = DPiController.getInstance();
    /**
     * @api {get} /dpi/health Health status
     * @apiGroup DPi
     * @apiDescription Health status of the DPi Generator (available or not available)
     *
     * @apiVersion 0.1.1
     **/
    this.app.get(
      config.http.baseUrl + "/things/types/dpi/health",
      this.dpiController.healthStatus
    );

    this.propertyTypeRouter = new PropertyTypeRouter(this.app)
    this.app.use(config.http.baseUrl + "/types", this.propertyTypeRouter.getRouter());

    /**
     * @api {get} /properties List
     * @apiGroup Properties
     * @apiDescription List all properties accessible for the authenticated person.
     *
     * @apiVersion 0.1.1
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiSuccess {Property[]} properties The retrieved Properties
     **/
    this.app.get(
      config.http.baseUrl + "/properties",
      [this.authController.authenticate(["dcd:properties", "dcd:consents"])],
      this.propertyController.getProperties
    );

    this.app.use(config.http.baseUrl + "/docs", express.static("dist/public/docs/rest"));


    this.app.use((
      request: Request,
      response: Response,
      next: NextFunction): void => {
      next(new DCDError(404, 'This URL does not match any Bucket API.'));
    });

    this.app.use(this.errorHandler);
  }

  public async start(): Promise<void> {
    this.server = this.app.listen(config.http.port, () => {
      Log.info("HTTP Server started on port " + config.http.port + ".");
      return Promise.resolve();
    });
  }

  public async stop(): Promise<void> {
    this.server.close((error: Error) => {
      if (error !== undefined) {
        Log.error(error);
        return Promise.reject(error);
      } else {
        return Promise.resolve();
      }
    })
  }

  public errorHandler(
    error: DCDError,
    request: Request,
    response: Response,
    next: NextFunction
  ): void {
    console.log("error handler");
    const status = error._statusCode || 500;
    const message = error.message || "Something went wrong";
    Log.debug(
      JSON.stringify({
        status,
        message,
        name: error.name,
        hint: error._hint,
        requirements: error._requirements,
        stack: error.stack,
        code: error.errorCode,
      })
    );
    if (config.env.env === "development") {
      response.status(status).send({
        status,
        message,
        name: error.name,
        hint: error._hint,
        requirements: error._requirements,
        stack: error.stack,
        code: error.errorCode,
      });
    } else {
      response.status(status).send({
        status,
        message,
        name: error.name,
        hint: error._hint,
        requirements: error._requirements,
      });
    }
  }
}