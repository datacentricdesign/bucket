import config from "./config";
import { Logger, ILogObject } from "tslog";
import { appendFileSync, mkdir, mkdirSync } from "fs";
import * as moment from 'moment'

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

    if (config.env.env === 'development') {
      Log.logger = new Logger({ name: name, type: 'pretty' });
    } else {
      Log.logger = new Logger({ name: name, type: 'hidden' });
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

    Log.silly = Log.logger.silly.bind(Log.logger)
    Log.debug = Log.logger.debug.bind(Log.logger)
    Log.trace = Log.logger.trace.bind(Log.logger)
    Log.info = Log.logger.info.bind(Log.logger)
    Log.warn = Log.logger.warn.bind(Log.logger)
    Log.error = Log.logger.error.bind(Log.logger)
    Log.fatal = Log.logger.fatal.bind(Log.logger)

    // Make sure there is a subfolder to store images and logs
    try {
      mkdirSync(config.hostDataFolder + '/logs')
    } catch (error) {
      if (error && error.errno !== -17) {
        return Log.error(error)
      }
    }

  }
}

function logToTransport(logObject: ILogObject) {
  try {
    appendFileSync(config.hostDataFolder + '/logs/' + moment(new Date()).format('YYYY-MM-DD_HH') + '.log', JSON.stringify(logObject) + "\n");
  } catch(error) {
    console.log(error)
  }
}
