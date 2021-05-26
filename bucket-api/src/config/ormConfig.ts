import * as dotenv from "dotenv";

import "reflect-metadata";
import { ConnectionOptions } from "typeorm";

dotenv.config();

export const ORMConfig: ConnectionOptions = {
  type: "postgres",
  host: process.env.BUCKET_POSTGRES_HOST,
  port: Number(process.env.BUCKET_POSTGRES_PORT),
  username: process.env.BUCKET_POSTGRES_USER,
  password: process.env.BUCKET_POSTGRES_PASSWORD,
  database: process.env.BUCKET_POSTGRES_DB,
  synchronize: true,
  logging: process.env.BUCKET_POSTGRES_LOGGING === "true",
  entities: [
    "./src/thing/Thing.ts",
    "./src/thing/role/Role.ts",
    "./src/thing/property/Property.ts",
    "./src/thing/property/dimension/Dimension.ts",
    "./src/thing/property/propertyType/PropertyType.ts",
  ],
  migrations: ["./src/thing/migration/**/*.ts"],
  subscribers: ["./src/thing/subscriber/**/*.ts"],
  // cli: {
  //     entitiesDir: "./thing/entities",
  //     migrationsDir: "./thing/migration",
  //     subscribersDir: "./thing/subscriber"
  // }
};

export default ORMConfig;
