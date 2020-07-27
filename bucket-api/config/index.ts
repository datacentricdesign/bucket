import 'dotenv/config';

import { cleanEnv, str, port, bool, url } from "envalid";
import { envConfig } from "./envConfig";
import { ORMConfig } from "./ormConfig";
import { httpConfig } from "./httpConfig";
import { authConfig } from './authConfig';
import { influxdbConfig } from './influxdbConfig';
import { mqttConfig } from './mqttConfig';
import aedes = require('aedes');
import { Context } from '../types';

function validateEnv() {
  cleanEnv(process.env, {
    // Host folder where to store the data
    HOST_DATA_FOLDER: str(),
    // Secret to encrypt all JWT
    JWT_SECRET: str(),
    // Environment
    NODE_ENV: str(),
    DEV_USER: str(),
    DEV_TOKEN: str(),
    // Postgres Settings
    POSTGRES_HOST: str(),
    POSTGRES_USER: str(),
    POSTGRES_PASSWORD: str(),
    POSTGRES_PORT: port(),
    POSTGRES_DB: str(),
    POSTGRES_LOGGING: bool(),
    // Influx Settings
    INFLUXDB_HOST: str(),
    INFLUXDB_DB: str(),
    // HTTP Settings
    HTTP_HOST: str(),
    HTTP_PORT: port(),
    HTTP_SECURED: bool(),
    HTTP_BASE_URL: str(),
    // MQTT Settings
    MQTT_HOST: str(),
    MQTT_PORT: port(),
    MQTT_CLIENT_ID: str(),
    MQTT_CLIENT_USER: str(),
    MQTT_CLIENT_PASS: str(),
    // OAuth2 Settings
    OAUTH2_TOKEN_URL: url(),
    OAUTH2_REVOKE_URL: url(),
    OAUTH2_INTROSPECT_URL: url(),
    OAUTH2_CLIENT_ID: str(),
    OAUTH2_CLIENT_SECRET: str(),
    OAUTH2_SCOPE: str(),
    ACP_URL: url(),
  });

}

validateEnv()

export default {
  homeDataFolder: process.env.HOME_DATA_FOLDER,
  jwtSecret: process.env.JWT_SECRET,
  env: envConfig,
  orm: ORMConfig,
  http: httpConfig,
  oauth2: authConfig,
  influxdb: influxdbConfig,
  mqtt: mqttConfig,
};

// Setup context of Request to pass user info once identified

declare global {
  namespace Express {
    interface Request {
      context: Context
    }
  }
}
