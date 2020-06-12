import 'dotenv/config';
import {ThingRouter} from './thing/ThingRouter';

import {createConnection, getRepository} from "typeorm";

import * as express from "express";
import * as bodyParser from "body-parser";
import * as helmet from "helmet";
import * as cors from "cors";
import config from "./config";
import errorMiddleware from './thing/middlewares/ErrorMiddleware';
import { PropertyTypeRouter } from './thing/property/propertyType/PropertyTypeRouter';
import { PropertyType } from './thing/property/propertyType/PropertyType';
import { Dimension } from './thing/property/dimension/Dimension';

// Connects to the Relational Database -> then starts the express
createConnection(config.orm)
    .then(async connection => {
        // Create a new express application instance
        const app = express();

        // Call middleware
        app.use(cors());
        app.use(helmet());
        app.use(bodyParser.json());

        // Set all routes from routes folder
        app.use("/things", ThingRouter);
        app.use("/types", PropertyTypeRouter);
        app.use(errorMiddleware)

        // Start listening
        app.listen(config.http.port, () => {
            console.log("Server started on port "+ config.http.port +"!");
        });

    })
    .catch(error => console.log(error));