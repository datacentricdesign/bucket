import "dotenv/config";

export const influxdbConfig = {
  url: process.env.BUCKET_INFLUXDB_URL,
  token: process.env.BUCKET_INFLUXDB_TOKEN,
  org: process.env.BUCKET_INFLUXDB_ORG,
  bucket: process.env.BUCKET_INFLUXDB_BUCKET,
  username: process.env.BUCKET_INFLUXDB_USER,
  password: process.env.BUCKET_INFLUXDB_PASS,
};
