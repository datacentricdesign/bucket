import * as mqtt from "mqtt";
import { DTOProperty } from "@datacentricdesign/types";
import { ISubscriptionGrant, MqttClient } from "mqtt";
import { Property } from "../property/Property";
import config from "../../config";
import { Log } from "../../Logger";
import { ThingService } from "../services/ThingService";
import { PropertyService } from "../property/PropertyService";

export interface MQTTClientSettings {
  keepalive: number;
  protocolId: string;
  protocolVersion: number;
  clientId: string;
  username: string;
  password: string;
}

/**
 * = = = = = = = = = = = MQTT API = = = = = = = = = = =
 */

const propertyCreateRegEx = new RegExp("/things/.*/properties/create"),
  propertyUpdateRegEx = new RegExp("/things/.*/properties/.*"),
  thingReadRegEx = new RegExp("/things/.*/read"),
  thingLogsRegEx = new RegExp("/things/.*/log"),
  thingDataRegEx = new RegExp("/things/.*/reply");

interface MQTTMessage {
  requestId?: string;
  property?: Property;
}

/**
 * This class set up an MQTT client as Bucket MQTT API,
 * listening to /things#
 */
export class ThingMQTTClient {
  private port: number;

  private host: string;

  private settings: MQTTClientSettings;

  private client: MqttClient;

  private thingService: ThingService;

  private propertyService: PropertyService;

  constructor(port: number, host: string, settings: MQTTClientSettings) {
    this.port = port;
    this.host = host;
    this.settings = settings;

    this.thingService = ThingService.getInstance();
    PropertyService.getInstance(this).then(
      (service) => (this.propertyService = service)
    );
  }

  connect(): Promise<void> {
    const url = `mqtt${config.http.secured ? "s" : ""}://${this.host}:${
      this.port
    }`;
    Log.debug(`MQTT connect: ${url}`);
    this.client = mqtt.connect(url, this.settings);
    this.client.on("connect", this.onMQTTConnect.bind(this));
    this.client.on("message", this.onMQTTMessage.bind(this));
    return Promise.resolve();
  }

  /**
   *
   */
  onMQTTConnect(): void {
    Log.debug(`Bucket connected to MQTT: ${this.client.connected}`);
    this.client.subscribe(
      "/things/#",
      (error: Error, result: ISubscriptionGrant[]) => {
        if (error) {
          Log.error(
            `Error while subscribing to MQTT: ${JSON.stringify(error)}`
          );
        } else {
          Log.debug(`MQTT subscription success: ${JSON.stringify(result)}`);
        }
      }
    );
  }

  /**
   * @param topic
   * @param message
   */
  onMQTTMessage(topic: string, message: string): Promise<void> | MqttClient {
    let jsonMessage: MQTTMessage;
    try {
      jsonMessage = JSON.parse(message);
    } catch (error) {
      jsonMessage = {};
    }

    const topicArray = topic.split("/"),
      thingId = topicArray[2];

    // Update property /things/:thingId/properties/:propertyId/update
    if (propertyUpdateRegEx.test(topic)) {
      const property = <Property>jsonMessage.property;
      if (jsonMessage.property !== undefined && property.id === topicArray[4]) {
        return this.updatePropertyValues(
          thingId,
          jsonMessage.requestId,
          jsonMessage.property,
          this.client
        );
      }
      return this.client.publish(
        `/things/${thingId}/log`,
        JSON.stringify({
          level: "error",
          error: "Missing or malformed property to update its values",
          requestId: jsonMessage.requestId,
        })
      );
    }

    // Create property /things/:thingId/properties/create
    if (propertyCreateRegEx.test(topic)) {
      return this.createProperty(
        thingId,
        jsonMessage.requestId,
        jsonMessage.property,
        this.client
      );
    }

    // Read thing /things/:thingId/read
    if (thingReadRegEx.test(topic)) {
      return this.readThing(thingId, jsonMessage.requestId, this.client);
    }

    if (thingLogsRegEx.test(topic)) {
      // Ignore logs for each things
      return;
    }

    if (thingDataRegEx.test(topic)) {
      // Ignore logs for each things
      return;
    }

    Log.debug(`No implementation of ${topic}`);
  }

  async createProperty(
    thingId: string,
    requestId: string,
    dtoProperty: DTOProperty,
    client: MqttClient
  ): Promise<void> {
    Log.debug("create property");
    Log.debug(dtoProperty);
    try {
      // Retrieve thing details from thingId
      const thing = await this.thingService.getOneThingById(thingId),
        property: Property = await this.propertyService.createNewProperty(
          thing,
          dtoProperty
        );
      client.publish(
        `/things/${thingId}/reply`,
        JSON.stringify({ property, requestId })
      );
    } catch (error) {
      client.publish(
        `/things/${thingId}/log`,
        JSON.stringify({ level: "error", error, requestId })
      );
    }
  }

  async updatePropertyValues(
    thingId: string,
    requestId: string,
    property: Property,
    client: MqttClient
  ): Promise<void> {
    property.thing.id = thingId;
    try {
      await this.propertyService.updatePropertyValues(property);
      client.publish(
        `/things/${thingId}/log`,
        JSON.stringify({
          level: "debug",
          message: "Property value updated",
          code: 0,
          requestId,
        })
      );
    } catch (error) {
      Log.error(error);
      client.publish(
        `/things/${thingId}/log`,
        JSON.stringify({ level: "error", error, requestId })
      );
    }
  }

  async readThing(
    thingId: string,
    requestId: string,
    client: MqttClient
  ): Promise<void> {
    try {
      const result = await this.thingService.getOneThingById(thingId);
      client.publish(
        `/things/${thingId}/reply`,
        JSON.stringify({ thing: result, requestId })
      );
    } catch (error) {
      Log.error(error);
      client.publish(
        `/things/${thingId}/log`,
        JSON.stringify({ level: "error", error, requestId })
      );
    }
  }
}
