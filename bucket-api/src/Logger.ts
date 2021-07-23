import config from "./config";
import { Logger, ILogObject } from "tslog";
import { appendFileSync, mkdirSync } from "fs";
import * as moment from "moment";

export class Log {
  static logger: Logger;
  static silly: Function;
  static debug: Function;
  static trace: Function;
  static info: Function;
  static warn: Function;
  static error: Function;
  static fatal: Function;

  static init(name: string) {
    if (config.env.env === "development") {
      Log.logger = new Logger({
        name: name,
        type: "pretty",
        ignoreStackLevels: 4,
      });
    } else {
      Log.logger = new Logger({
        name: name,
        type: "hidden",
        ignoreStackLevels: 4,
      });
    }

    Log.logger.attachTransport(
      {
        silly: logToTransport,
        debug: logToTransport,
        trace: logToTransport,
        info: logToTransport,
        warn: logToTransport,
        error: logToTransport,
        fatal: logToTransport,
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
      mkdirSync(config.hostDataFolder + "/logs");
    } catch (error) {
      if (error && error.errno !== -17) {
        try {
          return Log.error(error);
        } catch (error) {
          console.error(error);
        }
      }
    }
  }

  static convertArgObjectToString(args: unknown[]): unknown[] {
    const argsStr = [];
    for (const arg of args) {
      if (typeof arg === "object" && arg !== null) {
        argsStr.push(Log.safeStringify(arg));
      } else {
        argsStr.push(arg);
      }
    }
    return argsStr;
  }
  // safely handles circular references
  static safeStringify(obj, indent = 2) {
    let cache = [];
    const retVal = JSON.stringify(
      obj,
      (key, value) =>
        typeof value === "object" && value !== null
          ? cache.includes(value)
            ? "[Duplicate reference removed to avoid circularity]" // Duplicate reference found, discard key
            : cache.push(value) && value // Store value in our collection
          : value,
      indent
    );
    cache = null;
    return retVal;
  }
}

function logToTransport(logObject: ILogObject) {
  try {
    appendFileSync(
      config.hostDataFolder +
        "/logs/" +
        moment(new Date()).format("YYYY-MM-DD_HH") +
        ".log",
      Log.safeStringify(logObject) + "\n"
    );
  } catch (error) {
    console.log(error);
  }
}
