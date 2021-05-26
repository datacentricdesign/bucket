import * as dotenv from "dotenv";

dotenv.config();

const envConfig = {
  env: process.env.NODE_ENV,
  devUser: process.env.DEV_USER,
  devToken: process.env.DEV_TOKEN,

  dpiUrl: process.env.DPI_URL,
};

export default envConfig;
