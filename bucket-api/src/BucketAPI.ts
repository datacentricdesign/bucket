import "reflect-metadata";
import { createConnection } from "typeorm";

import * as express from "express";
import * as bodyParser from "body-parser";
import * as cookieParser from "cookie-parser";
import * as helmet from "helmet";
import * as cors from "cors";
import { Server } from "http";
import config from "./config";
import { Log } from "./Logger";

import { ThingRouter } from "./thing/http/ThingRouter";

import errorMiddleware from "./thing/middlewares/ErrorMiddleware";

import { introspectToken } from "./thing/middlewares/introspectToken";
import { PropertyTypeRouter } from "./thing/property/propertyType/PropertyTypeRouter";
import { BucketMQTTServer } from "./thing/mqtt/MQTTServer";

Log.init("Bucket");

export class BucketAPI {
  private app: express.Application;

  private server: Server;

  private mqttServer: BucketMQTTServer;

  async start(delayMs: number): Promise<void> {
    Log.info("Bucket starting...");

    return (
      createConnection(config.orm)
        .then(async (connection) => {
          Log.info("Connected to Postgres");
          await connection.runMigrations();
          this.mqttServer = new BucketMQTTServer();
          await this.mqttServer.mqttInit();
          return this.startAPI();
        })
        // Could not connect wait and try again
        .catch((error) => {
          Log.debug(JSON.stringify(error));
          Log.info(`Retrying to connect in ${delayMs} ms.`);
          BucketAPI.delay(delayMs).then(() => {
            return this.start(delayMs * 1.5);
          });
        })
    );
  }

  async startAPI(): Promise<void> {
    // Create a new express application instance
    this.app = express();

    // Call middleware
    this.app.use(cors());
    this.app.use(helmet());
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: false }));
    this.app.use(cookieParser());

    // Set all routes from routes folder
    const thingRouter = new ThingRouter();
    this.app.use(`${config.http.baseUrl}/things`, thingRouter.getRouter());

    /**
     * @api {delete} /dpi/health Health status
     * @apiGroup DPi
     * @apiDescription Health status of the DPi Generator (available or not available)
     *
     * @apiVersion 0.1.0
     * */
    this.app.use(
      `${config.http.baseUrl}/things/types/dpi/health`,
      thingRouter.getDPiRouter().getController().healthStatus
    );

    const propertyTypeRouter = new PropertyTypeRouter();
    this.app.use(
      `${config.http.baseUrl}/types`,
      propertyTypeRouter.getRouter()
    );

    /**
     * @api {get} /properties List
     * @apiGroup Properties
     * @apiDescription List all properties accessible for the authenticated person.
     *
     * @apiVersion 0.1.0
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiSuccess {Property[]} properties The retrieved Properties
     * */
    this.app.get(
      `${config.http.baseUrl}/properties`,
      [introspectToken(["dcd:properties", "dcd:consents"])],
      thingRouter.getPropertyRouter().getController().getProperties
    );

    this.app.use(
      `${config.http.baseUrl}/docs`,
      express.static("dist/public/docs")
    );

    this.app.use(errorMiddleware);

    // Start listening
    this.server = this.app.listen(config.http.port, () => {
      Log.info(`Server started on port ${config.http.port}!`);
    });
  }

  stop(): void {
    if (this.server !== undefined) {
      this.server.close();
    }
  }

  static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
