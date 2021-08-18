
import config from "./config";
import { Log } from "./Logger";

import { Connection, createConnection, Migration } from "typeorm";

import { MqttAPI } from "./mqtt/MqttAPI";
import { HttpAPI } from "./http/HttpAPI"
import { InfluxDbService } from "./influx/InfluxDbService";

export class Bucket {

    mqttAPI: MqttAPI;
    httpAPI: HttpAPI;

    connectionSQLDb: Connection;
    influxDbService: InfluxDbService;

    constructor() {
        Log.init("Bucket");
        this.initHTTP();
        this.initMQTT();
    }

    async start(delayMs = 1000) {
        const sqlPromise = this.connectSQLDb()
            .catch((error: Error) => {
                // Could not connect wait and try again
                Log.debug(JSON.stringify(error));
                Log.info("Retrying to connect in " + delayMs + " ms.");
                delay(delayMs).then(() => {
                    return this.connectSQLDb();
                });
            });
        const influxPromise = this.connectInfluxDb()
            .catch((error) => {
                Log.error(JSON.stringify(error));
                Log.info("Retrying to connect to InfluxDB in " + delayMs + " ms.");
                delay(delayMs).then(() => {
                    return this.connectInfluxDb();
                });
            });

        // When both Database connections are established
        Promise.all([sqlPromise, influxPromise])
            .then( () => {
                this.startHTTP();
                this.startMQTT();
            })
    }

    stop() {
        return Promise.all([this.stopHTTP(), this.stopMQTT(), this.disconnectSQLDb()]);
    }

    async connectSQLDb(): Promise<void> {
        Log.info("Connecting SQL Database...");
        return createConnection(config.orm)
            .then((connection: Connection) => {
                Log.info("Running SQL Migrations...");
                this.connectionSQLDb = connection;
                return this.connectionSQLDb.runMigrations();
            })
            .then((migrations: Migration[]) => {
                Log.info("Migrations applied: " + migrations.length);
                return Promise.resolve()
            })
            .catch((error: Error) => {
                Log.error("Error while connecting and migrating the SQL database:");
                Log.error(error)
                return Promise.reject(error);
            })
    }

    disconnectSQLDb(): Promise<void> {
        Log.info("Disconnecting SQL Database...");
        return this.connectionSQLDb.close()
            .then(() => {
                Log.info("SQL Database disconnected.");
                return Promise.resolve();
            })
            .catch((error: Error) => {
                Log.error("Error while disconnecting the SQL database:");
                Log.error(error)
                return Promise.reject(error);
            })
    }

    async connectInfluxDb(): Promise<void> {
        Log.info("Connecting Influx Database...");
        this.influxDbService = InfluxDbService.getInstance();
        return this.influxDbService.connect();
    }

    initMQTT() {
        Log.info("Initialising MQTT API...");
        this.mqttAPI = new MqttAPI();
    }

    startMQTT(): Promise<void> {
        Log.info("Starting MQTT API...");
        return this.mqttAPI.start()
            .then(() => {
                Log.info("MQTT API started.");
                return Promise.resolve();
            })
            .catch((error: Error) => {
                Log.error("Error while starting MQTT:");
                Log.error(error)
                return Promise.reject(error);
            })
    }

    stopMQTT(): Promise<void> {
        Log.info("Stopping MQTT API...");
        return this.mqttAPI.stop()
            .then(() => {
                Log.info("MQTT API stopped.");
                return Promise.resolve();
            })
            .catch((error: Error) => {
                Log.error("Error while stopping MQTT:");
                Log.error(error)
                return Promise.reject(error);
            })
    }

    initHTTP() {
        Log.info("Initialising HTTP API...");
        this.httpAPI = new HttpAPI();
    }

    startHTTP(): Promise<void> {
        Log.info("Starting HTTP API...");
        return this.httpAPI.start()
            .then(() => {
                Log.info("HTTP API started.");
                return Promise.resolve();
            })
            .catch((error: Error) => {
                Log.error("Error while starting HTTP API:");
                Log.error(error)
                return Promise.reject(error);
            });
    }

    stopHTTP(): Promise<void> {
        Log.info("Stopping HTTP...");
        return this.httpAPI.stop()
            .then(() => {
                Log.info("HTTP API stopped.");
                return Promise.resolve();
            })
            .catch((error: Error) => {
                Log.error("Error while stopping HTTP API:");
                Log.error(error)
                return Promise.reject(error);
            });
    }

}

function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}