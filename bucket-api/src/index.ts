import config from "./config";
import { Log } from "./Logger";
Log.init("Bucket")

import { ThingRouter } from './thing/http/ThingRouter';

import { createConnection } from "typeorm";

import * as express from "express";
import * as bodyParser from "body-parser";
import * as cookieParser from 'cookie-parser'
import * as helmet from "helmet";
import * as cors from "cors";
import errorMiddleware from './thing/middlewares/ErrorMiddleware';

import { mqttInit } from './thing/mqtt/MQTTServer';
import { introspectToken } from "./thing/middlewares/introspectToken";
import PropertyController from "./thing/property/PropertyController";
import DPiController from "./thing/dpi/DPiController";

Log.info("Bucket starting...")

waitAndConnect(1000);

function waitAndConnect(delayMs: number) {
    // Connects to the Relational Database -> then starts the express
    createConnection(config.orm)
        .then(async connection => {
            await connection.runMigrations();
            await mqttInit();
            startAPI()
        })
        // Could not connect wait and try again
        .catch((error) => {
            Log.debug(JSON.stringify(error));
            Log.info("Retrying to connect in " + delayMs + " ms.");
            delay(delayMs).then(() => {
                waitAndConnect(delayMs * 1.5);
            })
        });
}

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function startAPI() {
    // Create a new express application instance
    const app = express();

    // Call middleware
    app.use(cors());
    app.use(helmet());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(cookieParser());

    // Set all routes from routes folder
    app.use(config.http.baseUrl + "/things", ThingRouter);

    /**
    * @api {delete} /dpi/health Health status
    * @apiGroup DPi
    * @apiDescription Health status of the DPi Generator (available or not available)
    *
    * @apiVersion 0.1.0
    **/
    app.use(config.http.baseUrl + "/things/types/dpi/health", DPiController.healthStatus);

    // app.use(config.http.baseUrl + "/types", PropertyTypeRouter);

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
    **/
    app.get(config.http.baseUrl + "/properties",
        [introspectToken(['dcd:properties', 'dcd:consents'])],
        PropertyController.getProperties);

    app.use(config.http.baseUrl + "/docs", express.static('dist/public/docs'))

    app.use(errorMiddleware)

    // Start listening
    app.listen(config.http.port, () => {
        Log.info("Server started on port " + config.http.port + "!");
    });
}