import {
  AuthenticateError,
  AuthErrorCode,
  Client,
  Server,
  Aedes,
  Subscription,
  PublishPacket,
} from "aedes";

import * as fs from "fs";
import * as tls from "tls";
import * as net from "net";
import { Context, DCDError } from "@datacentricdesign/types";
import config from "../../config";
import { ThingMQTTClient } from "./ThingMQTTClient";
import Property from "../property/Property";
import Log from "../../Log";

import { Access, PolicyService } from "../services/PolicyService";
import PropertyService from "../property/PropertyService";
import { ThingService } from "../services/ThingService";
import { AuthService } from "../services/AuthService";

interface DCDClient extends Client {
  context: Context;
}

type AuthPublishCallback = (error?: Error | null) => void;
type AuthSubscribeCallback = (
  error: Error | null,
  subscription?: Subscription | null
) => void;
type AuthCallback = (error: AuthenticateError, success: boolean | null) => void;

class MQTTServer {
  private server: tls.Server | net.Server;

  private aedes: Aedes;

  private propertyService: PropertyService;

  private thingService: ThingService;

  private policyService: PolicyService;

  private authService: AuthService;

  private mqttClient: ThingMQTTClient;

  constructor() {
    PropertyService.getInstance(this).then((service) => {
      this.propertyService = service;
    });
    this.thingService = ThingService.getInstance();
    this.policyService = PolicyService.getInstance();

    this.aedes = Server({
      authenticate: this.authenticate.bind(this),
      authorizePublish: this.authorizePublish.bind(this),
      authorizeSubscribe: this.authorizeSubscribe.bind(this),
    });

    if (config.http.secured) {
      Log.debug("Starting mqtts server over SSL...");
      const options = {
        key: fs.readFileSync(config.mqtt.secure.keyPath),
        cert: fs.readFileSync(config.mqtt.secure.certPath),
      };
      this.server = tls.createServer(options, this.aedes.handle);
    } else {
      Log.info("Starting mqtt server...");
      this.server = net.createServer(this.aedes.handle);
    }
  }

  mqttInit(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(config.mqtt.port, () => {
        Log.info("MQTT server listening on port ", config.mqtt.port);
        this.mqttClient = new ThingMQTTClient(
          config.mqtt.port,
          config.mqtt.host,
          config.mqtt.client
        );
        this.mqttClient.connect().then(() => {
          resolve();
        });
      });
    });
  }

  updateStatusProperty(client: DCDClient, status: string): void {
    Log.debug("update status property...");
    if (client.context.userId.startsWith("dcd:things:")) {
      this.findOrCreateMQTTStatusProperty(client.context.userId)
        .then((property: Property) => {
          const prop = { ...property };
          prop.values = [[new Date().getTime(), status]];
          this.propertyService.updatePropertyValues(prop);
        })
        .catch((error) => {
          Log.error(error);
        });
    }
  }

  /**
   * @param thingId
   */
  async findOrCreateMQTTStatusProperty(thingId: string): Promise<Property> {
    try {
      const properties = await this.propertyService.getPropertiesOfAThingByType(
        thingId,
        "MQTT_STATUS"
      );
      if (properties.length > 0) {
        return await Promise.resolve(properties[0]);
      }
      // Retrieve thing details from thingId
      const thing = await ThingService.getOneThingById(thingId);
      return await this.propertyService.createNewProperty(thing, {
        typeId: "MQTT_STATUS",
      });
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async authorizePublish(
    client: DCDClient,
    packet: PublishPacket,
    callback: AuthPublishCallback
  ): Promise<void> {
    Log.debug("publish");
    if (client.context.userId === config.mqtt.client.username) {
      return callback(null);
    }

    const topicArray = packet.topic.substr(1).split("/");
    let action = "dcd:actions:update";
    if (
      topicArray.length > 0 &&
      topicArray.length > 0 &&
      (topicArray[topicArray.length - 1] === "log" ||
        topicArray[topicArray.length - 1] === "reply")
    ) {
      action = `dcd:actions:${topicArray.pop()}`;
    }

    let resource = `dcd:${topicArray.join(":")}`;
    if (resource.startsWith("dcd:things:dcd:things:")) {
      resource = resource.replace("dcd:things:dcd:things:", "dcd:things:");
    }

    const acp: Access = {
      action,
      resource,
      subject: client.context.userId,
    };

    try {
      await this.policyService.check(acp);
      callback(null);
    } catch (errorResult) {
      Log.debug(JSON.stringify(errorResult));
      const error = new DCDError(
        4031,
        `NOT authorised to publish on ${packet.topic}`
      );
      callback(error);
    }
  }

  async authorizeSubscribe(
    client: DCDClient,
    packet: Subscription,
    callback: AuthSubscribeCallback
  ): Promise<void> {
    if (client.context.userId === config.mqtt.client.username) {
      return callback(null, packet);
    }

    const topicArray = packet.topic.substr(1).split("/");
    let action = "dcd:actions:read";
    if (
      topicArray.length > 0 &&
      (topicArray[topicArray.length - 1] === "log" ||
        topicArray[topicArray.length - 1] === "reply")
    ) {
      action = `dcd:actions:${topicArray.pop()}`;
    }

    let resource = `dcd:${topicArray.join(":").replace("#", "<.*>")}`;
    if (resource.startsWith("dcd:things:dcd:things:")) {
      resource = resource.replace("dcd:things:dcd:things:", "dcd:things:");
    }

    const acp: Access = {
      action,
      resource,
      subject: client.context.userId,
    };

    try {
      await this.policyService.check(acp);
      callback(null, packet);
    } catch (errorResult) {
      const error = new DCDError(
        4031,
        `Subscription denied to ${packet.topic}`
      );
      Log.error(errorResult);
      Log.debug(JSON.stringify(error));
      if (resource.includes(":properties:dcd:")) {
        const consents = await this.policyService.listConsents(
          "resource",
          `dcd:${resource.split(":properties:dcd:")[1]}`
        );
        for (let i = 0; i < consents.length; i += 1) {
          const consent = consents[i];
          for (let j = 0; j < consent.subjects.length; j += 1) {
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

  async authenticate(
    client: DCDClient,
    username: string,
    password: Buffer,
    callback: AuthCallback
  ): Promise<void> {
    Log.debug(`authenticate with credentials: ${username}`);
    if (username === config.mqtt.client.username) {
      Log.debug("DCD client mqtt");
      client.context = {
        userId: username,
      };
      // client.user.token = password
      return callback(null, true);
    }
    Log.debug("NOT DCD client mqtt");

    if (password === undefined) {
      const error = <AuthenticateError>(
        new Error("Missing token in the password field.")
      );
      error.returnCode = AuthErrorCode.BAD_USERNAME_OR_PASSWORD;
      callback(error, null);
      return callback(error, false);
    }
    this.authService
      .checkJWTAuth(password.toString(), username)
      .then(() => {
        client.context = {
          userId: username,
        };
        callback(null, true);
      })
      .catch((error: DCDError) => {
        const mqttError = <AuthenticateError>new Error(error.message);
        mqttError.returnCode = AuthErrorCode.BAD_USERNAME_OR_PASSWORD;
        Log.error(error);
        callback(mqttError, false);
      });
  }
}

export default MQTTServer;
