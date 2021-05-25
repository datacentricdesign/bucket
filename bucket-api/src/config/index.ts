import "dotenv/config";

import { bool, cleanEnv, port, str, url } from "envalid";
import { envConfig } from "./envConfig";
import { ORMConfig } from "./ormConfig";
import { httpConfig } from "./httpConfig";
import { authConfig } from "./authConfig";
import { influxdbConfig } from "./influxdbConfig";
import { mqttConfig } from "./mqttConfig";
import { grafanaConfig } from "./grafanaConfig";
import { Context } from "@datacentricdesign/types";
import { Request } from "express";

export function validateEnv(): void {
  cleanEnv(process.env, {
    // Host folder where to store the data
    HOST_DATA_FOLDER: str(),
    // Environment
    NODE_ENV: str(),
    DEV_USER: str(),
    DEV_TOKEN: str(),
    // Postgres Settings
    BUCKET_POSTGRES_HOST: str(),
    BUCKET_POSTGRES_USER: str(),
    BUCKET_POSTGRES_PASSWORD: str(),
    BUCKET_POSTGRES_PORT: port(),
    BUCKET_POSTGRES_DB: str(),
    BUCKET_POSTGRES_LOGGING: bool(),
    // Influx Settings
    BUCKET_INFLUXDB_HOST: str(),
    BUCKET_INFLUXDB_BUCKET: str(),
    BUCKET_INFLUXDB_USER: str(),
    BUCKET_INFLUXDB_PASS: str(),
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
    OAUTH2_INTROSPECT_URL: url(),
    OAUTH2_TOKEN_URL: url(),
    OAUTH2_REVOKE_URL: url(),
    OAUTH2_CLIENT_ID: str(),
    OAUTH2_CLIENT_SECRET: str(),
    OAUTH2_SCOPE: str(),
    OAUTH2_HYDRA_ADMIN_URL: url(),
    ACP_URL: url(),
    // GRAFANA Settings
    GRAFANA_API_URL: url(),
    GRAFANA_API_KEY: str(),
    GRAFANA_USER: str(),
    GRAFANA_PASS: str(),
  });
}

validateEnv();

export default {
  hostDataFolder: process.env.HOST_DATA_FOLDER,
  env: envConfig,
  orm: ORMConfig,
  http: httpConfig,
  oauth2: authConfig,
  influxdb: influxdbConfig,
  mqtt: mqttConfig,
  grafana: grafanaConfig,
};

// Setup context of Request to pass user info once identified

export type DCDRequest = Request & {
  context: Context;
};
