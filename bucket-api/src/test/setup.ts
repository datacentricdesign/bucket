import { Connection, createConnection } from "typeorm";
import config from "../config";
import Log from "../Log";

let connection: Connection;

// root hook to run before all test
before(async () => {
  Log.init("Test");
  connection = await createConnection(config.orm);
  Log.info("Connected to Postgres");
  await connection.runMigrations();
  Log.info("Migration done");
});

// root hook to run after all test
after(() => {
  connection.dropDatabase();
});
