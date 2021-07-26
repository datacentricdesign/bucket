
import config from "../config";
import { InfluxDB } from "influx";
import { Log } from "../Logger";
import { Property } from "../thing/property/Property";
import { DCDError, ValueOptions } from "@datacentricdesign/types";

export class InfluxDbService {

    private static instance: InfluxDbService;

    public static getInstance(): InfluxDbService {
        if (InfluxDbService.instance === undefined) {
            InfluxDbService.instance = new InfluxDbService();
        }
        return InfluxDbService.instance;
    }

    private influx: InfluxDB;
    private ready = false;

    private constructor() {

    }

    async connect(): Promise<void> {
        // Connect to the time series database
        this.influx = new InfluxDB(config.influxdb);
        this.influx.getDatabaseNames()
            // Double check the timeseries db exists
            .then(async (names) => {
                Log.info("Connected to InfluxDb");
                if (names.indexOf(config.influxdb.database) > -1) {
                    await this.influx.createDatabase(config.influxdb.database);
                    this.ready = true;
                }
                this.ready = true;
                return Promise.resolve();
            })
            .catch( (error) => {
                return Promise.reject(error);
            })
    }

    /**
     * @param {Property} property
     */
    public valuesToInfluxDB(property: Property) {
        Log.debug("Values to influx");
        const points = [];
        const dimensions = property.type.dimensions;
        for (const index in property.values) {
            let ts: number;
            const values: Array<string | number> = property.values[index];
            if (
                values.length - 1 === dimensions.length ||
                values.length === dimensions.length
            ) {
                if (values.length === dimensions.length) {
                    // missing time, take from server
                    ts = Date.now();
                    values.unshift(ts);
                } else {
                    ts =
                        typeof values[0] === "string"
                            ? Number.parseInt(values[0] + "")
                            : values[0];
                }

                const fields = {};
                for (let i = 1; i < values.length; i++) {
                    // check that we have numbers where we should
                    if (
                        (dimensions[i - 1].type === "number" &&
                            typeof values[i] !== "number") ||
                        (dimensions[i - 1].type !== "number" &&
                            typeof values[i] === "number")
                    ) {
                        return Promise.reject(
                            new DCDError(
                                404,
                                "Mismatch type of value for dimension " + dimensions[i - 1].id
                            )
                        );
                    }
                    // use dimension names to associate fields to values in InfluxDB
                    const name = dimensions[i - 1].name;
                    fields[name] = values[i];
                }

                const point = {
                    measurement: property.type.id,
                    tags: {
                        propertyId: property.id,
                        thingId: property.thing.id,
                    },
                    fields: fields,
                    timestamp: ts,
                };
                console.log(point);
                points.push(point);
            }
        }
        return this.influx.writePoints(points, { precision: "ms" });
    }

    /**
     * @param {Property} property
     * @param {ValueOptions} opt
     * @return {Promise<Property>}
     */
    public readValuesFromInfluxDB(
        property: Property,
        opt: ValueOptions
    ): Promise<Property> {
        Log.debug(opt);
        let query = `SELECT "time"`;
        for (const index in property.type.dimensions) {
            if (opt.timeInterval !== undefined) {
                query += `, ${opt.fctInterval}("${property.type.dimensions[index].name}")`;
            } else {
                query += `, "${property.type.dimensions[index].name}" `;
            }
        }
        query += ` FROM "${property.type.id}"`;

        if (opt.from !== undefined && opt.to !== undefined) {
            const start = new Date(opt.from).toISOString();
            const end = new Date(opt.to).toISOString();
            query += ` WHERE time >= '${start}' AND time <= '${end}' AND "thingId" = '${property.thing.id}' AND "propertyId" = '${property.id}'`;
        }

        if (opt.timeInterval !== undefined) {
            query += ` GROUP BY time(${opt.timeInterval}) fill(${opt.fill})`;
        }

        Log.debug(query);

        return this.influx
            .queryRaw(query, {
                precision: "ms",
                database: config.influxdb.database,
            })
            .then((data) => {
                if (
                    data.results.length > 0 &&
                    data.results[0].series !== undefined &&
                    data.results[0].series.length > 0
                ) {
                    property.values = data.results[0].series[0].values;
                } else {
                    property.values = [];
                }
                return Promise.resolve(property);
            });
    }

    public async counDataPoints(measurement: string, from: string, propertyId: string, timeInterval = undefined) {
        let query = `SELECT COUNT(*) FROM ${measurement} WHERE time > ${from} AND "propertyId" = '${propertyId}'`;
        if (timeInterval !== undefined) query += ` GROUP BY time(${timeInterval})`;
        return this.influx
            .queryRaw(query, {
                precision: "ms",
                database: config.influxdb.database,
            })
            .then((data) => {
                if (data.results[0].series === undefined) return Promise.resolve([]);
                return Promise.resolve(data.results[0].series[0].values);
            })
            .catch((error) => {
                return error;
            });
    }

    public async lastDataPoints(property) {
        const query = `SELECT * FROM ${property.type.id}  WHERE "propertyId" = '${property.id}' ORDER BY DESC LIMIT 1`;
        return this.influx
            .queryRaw(query,
                {
                    precision: "ms",
                    database: config.influxdb.database,
                }
            )
            .then((data) => {
                return Promise.resolve(data.results[0].series[0].values);
            })
            .catch((error) => {
                return error;
            });
    }

}