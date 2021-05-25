import { Connection, createConnection } from "typeorm";
import config from "../config";
import { Log } from "../Logger";

let connection: Connection;

// Root hook to run before all test
before(async function () {
  this.timeout(10000);
  Log.init("Test");
  connection = await createConnection(config.orm);
  Log.info("Connected to Postgres");
  await connection.runMigrations();
  Log.info("Migration done");
});

// Root hook to run after all test
after(function () {
  connection.dropDatabase();
});
