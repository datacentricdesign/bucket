import * as dotenv from "dotenv";

import { URL } from "url";

dotenv.config();

const grafanaConfig = {
  apiKey: process.env.GRAFANA_API_KEY,
  apiURL: new URL(process.env.GRAFANA_API_URL),
  user: process.env.GRAFANA_USER,
  pass: process.env.GRAFANA_PASS,
};

export default grafanaConfig;
