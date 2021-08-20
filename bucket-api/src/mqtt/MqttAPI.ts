import {
  AuthenticateError,
  AuthErrorCode,
  Client as AedesClient,
  Server,
  Subscription,
  PublishPacket,
  Aedes,
} from "aedes";
import * as fs from "fs";
import * as tls from "tls";
import * as net from "net";
import config from "../config";
import { ThingMQTTClient } from "./ThingMQTTClient";
import { Context, DCDError } from "@datacentricdesign/types";
import { Property } from "../thing/property/Property";
import { Log } from "../Logger";
import { Token } from "simple-oauth2";
import { PropertyService } from "../thing/property/PropertyService";
import { PolicyService } from "../policy/PolicyService";
import { AuthService } from "../auth/AuthService";
import { ThingService } from "../thing/ThingService";

const MQTT_CODE_BAD_USERNAME_OR_PASSWORD = 4;
const MQTT_CODE_NOT_AUTHORIZED = 5;

interface Client extends AedesClient {
  context: Context;
  tokenExpiryTime: number;
}

type AuthPublishCallback = (error?: Error | null) => void;
type AuthSubscribeCallback = (
  error: Error | null,
  subscription?: Subscription | null
) => void;
type AuthCallback = (error: AuthenticateError, success: boolean | null) => void;

export class MqttAPI {
  private aedes: Aedes;
  private server: net.Server | tls.Server;

  private propertyService: PropertyService;
  private thingService: ThingService;
  private policyService: PolicyService;
  private authService: AuthService;

  constructor() {
    this.aedes = Server({
      authenticate: this.authenticate.bind(this),
      authorizePublish: this.authorizePublish.bind(this),
      authorizeSubscribe: this.authorizeSubscribe.bind(this),
    });

    if (config.http.secured) {
      Log.debug("Creating an mqtts server over SSL...");
      const options = {
        key: fs.readFileSync(config.mqtt.secure.keyPath),
        cert: fs.readFileSync(config.mqtt.secure.certPath),
      };
      this.server = tls.createServer(options, this.aedes.handle);
    } else {
      Log.debug("Creating an mqtt server...");
      this.server = net.createServer(this.aedes.handle);
    }

    this.aedes.on("clientReady", (client: Client) => {
      Log.debug("New connection: " + client.id);
      this.updateStatusProperty(client as Client, "Connected");
    });

    this.aedes.on("subscribe", (result) => {
      Log.debug("subscribed, result " + JSON.stringify(result));
    });

    this.aedes.on("closed", () => {
      Log.debug("closed");
    });

    this.aedes.on("ping", (packet, client: Client) => {
      Log.debug("ping");
      if (client.context.userId !== config.mqtt.client.username) {
        if (!accessIsStillValid(client)) {
          return client.close();
        } else {
          this.updateStatusProperty(client as Client, "Ping");
        }
      }
    });

    this.aedes.on("clientDisconnect", (client) => {
      Log.debug("clientDisconnect");
      this.updateStatusProperty(client as Client, "Disconnected");
    });

    this.propertyService = PropertyService.getInstance();
    this.thingService = ThingService.getInstance();
    this.policyService = PolicyService.getInstance();
    this.authService = AuthService.getInstance();
  }

  public async start(): Promise<void> {
    this.server.listen(config.mqtt.port, function () {
      Log.info("MQTT server listening on port ", config.mqtt.port);
      const mqttClient = new ThingMQTTClient(
        config.mqtt.host,
        config.mqtt.port,
        config.mqtt.client
      );
      return mqttClient.connect();
    });
  }

  public async stop(): Promise<void> {
    this.server.close((error: Error) => {
      if (error !== null) {
        return Promise.reject(error);
      } else {
        return Promise.resolve();
      }
    });
  }

  public async authorizePublish(
    client: Client,
    packet: PublishPacket,
    callback: AuthPublishCallback
  ): Promise<void> {
    Log.debug("publish");
    if (client.context.userId === config.mqtt.client.username) {
      return callback(null);
    }

    // Check that the token is still valid
    if (!accessIsStillValid(client)) {
      callback(new DCDError(403, "Token expired"));
      return client.close();
    }

    const topicArray = packet.topic.substr(1).split("/");
    let action = "dcd:actions:update";
    if (
      topicArray.length > 0 &&
      topicArray.length > 0 &&
      (topicArray[topicArray.length - 1] === "log" ||
        topicArray[topicArray.length - 1] === "reply")
    ) {
      action = "dcd:actions:" + topicArray.pop();
    }

    let resource = "dcd:" + topicArray.join(":");
    if (resource.startsWith("dcd:things:dcd:things:")) {
      resource = resource.replace("dcd:things:dcd:things:", "dcd:things:");
    }

    const acp = {
      action: action,
      resource: resource,
      subject: client.context.userId,
    };

    try {
      await this.policyService.check(acp);
      callback(null);
    } catch (errorResult) {
      Log.debug(JSON.stringify(errorResult));
      const error = new DCDError(
        4031,
        "NOT authorised to publish on " + packet.topic
      );
      callback(error);
    }
  }

  public async authorizeSubscribe(
    client: Client,
    packet: Subscription,
    callback: AuthSubscribeCallback
  ): Promise<void> {
    if (client.context.userId === config.mqtt.client.username) {
      return callback(null, packet);
    }

    // Check that the token is still valid
    if (!accessIsStillValid(client)) {
      callback(new DCDError(403, "Token expired"));
      return client.close();
    }

    const topicArray = packet.topic.substr(1).split("/");
    let action = "dcd:actions:read";
    if (
      topicArray.length > 0 &&
      (topicArray[topicArray.length - 1] === "log" ||
        topicArray[topicArray.length - 1] === "reply")
    ) {
      action = "dcd:actions:" + topicArray.pop();
    }

    let resource = "dcd:" + topicArray.join(":").replace("#", "<.*>");
    if (resource.startsWith("dcd:things:dcd:things:")) {
      resource = resource.replace("dcd:things:dcd:things:", "dcd:things:");
    }

    const acp = {
      action: action,
      resource: resource,
      subject: client.context.userId,
    };

    try {
      await this.policyService.check(acp);
      callback(null, packet);
    } catch (errorResult) {
      const error = new DCDError(
        4031,
        "Subscription denied to " + packet.topic
      );
      Log.error(errorResult);
      Log.debug(JSON.stringify(error));
      if (resource.includes(":properties:dcd:")) {
        const consents = await this.policyService.listConsents(
          "resource",
          "dcd:" + resource.split(":properties:dcd:")[1]
        );
        for (let i = 0; i < consents.length; i++) {
          const consent = consents[i];
          for (let j = 0; j < consent.subjects.length; j++) {
            try {
              await this.policyService.checkGroupMembership(
                acp.subject,
                consent.subjects[j]
              );
              return callback(null, packet);
            } catch (error) {
              Log.error(error);
            }
          }
        }
      }

      return callback(error);
    }
  }

  public async authenticate(
    client: Client,
    username: string,
    password: Buffer,
    callback: AuthCallback
  ): Promise<void> {
    Log.debug("authenticate with credentials: " + username);
    if (username === config.mqtt.client.username) {
      Log.debug("DCD client mqtt");
      client.context = {
        userId: username,
      };
      return callback(null, true);
    } else {
      Log.debug("NOT DCD client mqtt");
    }

    if (password === undefined) {
      const error = <AuthenticateError>(
        new Error("Missing token in the password field.")
      );
      error.returnCode = MQTT_CODE_BAD_USERNAME_OR_PASSWORD;
      callback(error, null);
      return callback(error, false);
    }
    this.authService
      .checkJWTAuth(password.toString(), username)
      .then((token: Token) => {
        client.context = {
          userId: username,
        };
        client.tokenExpiryTime = token.exp;
        callback(null, true);
      })
      .catch((error: DCDError) => {
        Log.error(error);
        const mqttError = <AuthenticateError>new Error(error.message);
        mqttError.returnCode = MQTT_CODE_NOT_AUTHORIZED;
        Log.error(error);
        callback(mqttError, false);
      });
  }

  updateStatusProperty(client: Client, status: string): void {
    Log.debug("update status property...");
    if (client.context.userId.startsWith("dcd:things:")) {
      this.findOrCreateMQTTStatusProperty(client.context.userId)
        .then((property: Property) => {
          property.values = [[new Date().getTime(), status]];
          this.propertyService.updatePropertyValues(property);
        })
        .catch((error) => {
          Log.error(error);
        });
    }
  }

  async findOrCreateMQTTStatusProperty(
    thingId: string
  ): Promise<Property> {
    try {
      const properties = await this.propertyService.getPropertiesByTypeId(
        thingId,
        "MQTT_STATUS"
      );
      if (properties.length > 0) {
        return Promise.resolve(properties[0]);
      } else {
        const thing = await this.thingService.getOneThingById(thingId);
        return this.propertyService.createNewProperty(thing, {
          typeId: "MQTT_STATUS",
        });
      }
    } catch (error) {
      return Promise.reject(error);
    }
  }
}

function accessIsStillValid(client: Client): boolean {
  Log.debug("Expiry time: " + client.tokenExpiryTime);
  Log.debug("Current time: " + Math.floor(Date.now() / 1000));
  return client.tokenExpiryTime > Math.floor(Date.now() / 1000);
}