import { createConnection } from "typeorm";
import config from "../config";
import { Log } from "../Logger";

// root hook to run before all test
before(async function () {
  this.timeout(10000);
  Log.init("Test");
  const connection = await createConnection(config.orm);
  Log.info("Connected to Postgres");
  await connection.runMigrations();
  Log.info("Migration done");
});

// root hook to run after all test
// afterEach(function () {});
