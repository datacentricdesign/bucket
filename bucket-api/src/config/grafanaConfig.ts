import 'dotenv/config';
import { URL } from 'url';

export const grafanaConfig: any = {
    apiKey: process.env.GRAFANA_API_KEY,
    apiURL: new URL(process.env.GRAFANA_API_URL)
};