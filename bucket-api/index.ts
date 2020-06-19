
import {ThingRouter} from './thing/http/ThingRouter';

import {createConnection} from "typeorm";

import * as express from "express";
import * as bodyParser from "body-parser";
import * as cookieParser from 'cookie-parser'
import * as helmet from "helmet";
import * as cors from "cors";
import config from "./config";
import errorMiddleware from './thing/middlewares/ErrorMiddleware';
import { PropertyTypeRouter } from './thing/property/propertyType/PropertyTypeRouter';

import { mqttInit } from './thing/mqtt/MQTTServer';
import { setupPassport } from './passport-dcd';

// Connects to the Relational Database -> then starts the express
createConnection(config.orm)
    .then(async connection => {
        return mqttInit()
    })
    .then( () => {
        // Create a new express application instance
        const app = express();

        // Call middleware
        app.use(cors());
        app.use(helmet());
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: false }));
        app.use(cookieParser());

        // Set all routes from routes folder
        app.use("/things", ThingRouter);
        app.use("/types", PropertyTypeRouter);
        app.use(errorMiddleware)

        setupPassport(app)

        // Start listening
        app.listen(config.http.port, () => {
            console.log("Server started on port "+ config.http.port +"!");
        });

    })
    .catch(error => console.log(error));
