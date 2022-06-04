import { Logger, ILogObject } from "tslog";
import { appendFileSync, mkdirSync } from "fs";
import * as moment from "moment";
import config from "./config";

type LogFunction = (...args: unknown[]) => ILogObject;

export class Log {
  static logger: Logger;

  static silly: LogFunction;

  static debug: LogFunction;

  static trace: LogFunction;

  static info: LogFunction;

  static warn: LogFunction;

  static error: LogFunction;

  static fatal: LogFunction;

  static init(name: string): void {
    if (config.env.env === "development" || config.env.env === "test") {
      Log.logger = new Logger({
        name,
        type: "json",
        ignoreStackLevels: 4,
      });
    } else {
      Log.logger = new Logger({
        name,
        type: "hidden",
        ignoreStackLevels: 4,
      });
    }

    Log.logger.attachTransport(
      {
        silly: Log.logToTransport,
        debug: Log.logToTransport,
        trace: Log.logToTransport,
        info: Log.logToTransport,
        warn: Log.logToTransport,
        error: Log.logToTransport,
        fatal: Log.logToTransport,
      },
      "debug"
    );

    Log.silly = (...args: unknown[]): ILogObject => {
      return Log.logger.silly(...Log.convertArgObjectToString(args));
    };
    Log.debug = (...args: unknown[]): ILogObject => {
      return Log.logger.debug(...Log.convertArgObjectToString(args));
    };
    Log.trace = (...args: unknown[]): ILogObject => {
      return Log.logger.trace(...Log.convertArgObjectToString(args));
    };
    Log.info = (...args: unknown[]): ILogObject => {
      return Log.logger.info(...Log.convertArgObjectToString(args));
    };
    Log.warn = (...args: unknown[]): ILogObject => {
      return Log.logger.warn(...Log.convertArgObjectToString(args));
    };
    Log.error = (...args: unknown[]): ILogObject => {
      return Log.logger.error(...Log.convertArgObjectToString(args));
    };
    Log.fatal = (...args: unknown[]): ILogObject => {
      return Log.logger.fatal(...Log.convertArgObjectToString(args));
    };

    // Make sure there is a subfolder to store images and logs
    try {
      mkdirSync(`${config.hostDataFolder}/logs`);
    } catch (error) {
      if (error && error.errno !== -17) {
        Log.error(error);
      }
    }
  }

  static convertArgObjectToString(args: unknown[]): unknown[] {
    const argsStr = [];
    for (let index = 0; index < args.length; index += 1) {
      const arg = args[index];
      if (typeof arg === "object" && arg !== null) {
        argsStr.push(Log.safeStringify(arg));
      } else {
        argsStr.push(arg);
      }
    }
    return argsStr;
  }

  // safely handles circular references
  static safeStringify(obj: unknown): string {
    let cache = [];
    const retVal = JSON.stringify(
      obj,
      (key, value) => {
        if (typeof value === "object" && value !== null) {
          if (cache.includes(value)) {
            return "[Duplicate reference removed to avoid circularity]"; // Duplicate reference found, discard key
          }
          cache.push(value);
          return value; // Store value in our collection
        }
        return value;
      }
    );
    cache = null;
    return retVal;
  }

  static logToTransport(logObject: ILogObject): void {
    appendFileSync(
      `${config.hostDataFolder}/logs/${moment(new Date()).format(
        "YYYY-MM-DD_HH"
      )}.log`,
      `${Log.safeStringify(logObject)}\n`
    );
  }
}
