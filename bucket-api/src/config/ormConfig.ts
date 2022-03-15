import "dotenv/config";
import { ConnectionOptions } from "typeorm";

export const ORMConfig: ConnectionOptions = {
  type: "postgres",
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  synchronize: true,
  logging: process.env.POSTGRES_LOGGING === "true",
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
  //     entitiesDir: "./thing",
  //     migrationsDir: "./thing/migration",
  //     subscribersDir: "./thing/subscriber"
  // }
};
