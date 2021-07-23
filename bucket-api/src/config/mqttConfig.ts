import "dotenv/config";
import { URL } from "url";

export const mqttConfig: any = {
  host: process.env.MQTT_HOST || "mqtt",
  port:
    process.env.MQTT_PORT !== undefined
      ? parseInt(process.env.MQTT_PORT)
      : 1883,
  client: {
    keepalive: 1000,
    protocolId: "MQIsdp",
    protocolVersion: 3,
    clientId: process.env.MQTT_CLIENT_ID,
    username: process.env.MQTT_CLIENT_USER,
    password: process.env.MQTT_CLIENT_PASS,
  },
  allowNonSecure: true,
  secure: {
    port: 8883,
    keyPath: process.env.KEY_PATH,
    certPath: process.env.CERT_PATH,
  },
};
