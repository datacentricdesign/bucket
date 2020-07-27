import { ConnectionOptions } from 'typeorm';

export const ORMConfig: ConnectionOptions = {
    type: 'postgres',
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    synchronize: true,
    logging: Boolean(process.env.POSTGRES_LOGGING),
    entities: [
        "./thing/Thing.ts",
        "./thing/role/Role.ts",
        "./thing/property/Property.ts",
        "./thing/property/dimension/Dimension.ts",
        "./thing/property/propertyType/PropertyType.ts"
    ],
    migrations: [
        "./thing/migration/**/*.ts"
    ],
    subscribers: [
        "./thing/subscriber/**/*.ts"
    ],
    // cli: {
    //     entitiesDir: "./thing/entities",
    //     migrationsDir: "./thing/migration",
    //     subscribersDir: "./thing/subscriber"
    // }
};
