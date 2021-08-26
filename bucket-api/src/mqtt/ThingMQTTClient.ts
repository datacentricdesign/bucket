import { DTOProperty } from "@datacentricdesign/types";
import * as mqtt from "mqtt";
import { IClientOptions, ISubscriptionGrant, MqttClient } from "mqtt";
import config from "../config";
import { Log } from "../Logger";
import { Property } from "../thing/property/Property";

import { PropertyService } from "../thing/property/PropertyService";
import { ThingService } from "../thing/ThingService";

interface MQTTMessage {
  requestId?: string;
  property?: Property;
}

/**
 * This class set up an MQTT client as Bucket MQTT API,
 * listening to /things# and catching all relevant messages.
 */
export class ThingMQTTClient {
  // = = = = = = = = = = = MQTT API = = = = = = = = = = =
  private static propertyCreateRegEx = new RegExp(
    "/things/.*/properties/create"
  );
  private static propertyUpdateRegEx = new RegExp("/things/.*/properties/.*");
  private static thingReadRegEx = new RegExp("/things/.*/read");
  private static thingLogsRegEx = new RegExp("/things/.*/log");
  private static thingDataRegEx = new RegExp("/things/.*/reply");

  private port: number;
  private host: string;
  private options: IClientOptions;
  private client: MqttClient;

  private propertyService: PropertyService;
  private thingService: ThingService;

  constructor(host: string, port: number, options: IClientOptions) {
    this.host = host;
    this.port = port;
    this.options = options;

    this.propertyService = PropertyService.getInstance();
    this.thingService = ThingService.getInstance();
  }

  connect(): Promise<void> {
    const url =
      "mqtt" +
      (config.http.secured ? "s" : "") +
      "://" +
      this.host +
      ":" +
      this.port;
    Log.debug("MQTT connect: " + url);
    this.client = mqtt.connect(url, this.options);
    this.client.on("connect", this.onMQTTConnect.bind(this));
    this.client.on("message", this.onMQTTMessage.bind(this));
    return Promise.resolve();
  }

  onMQTTConnect(): void {
    Log.debug("Bucket connected to MQTT: " + this.client.connected);
    this.client.subscribe(
      "/things/#",
      { qos: 0 },
      (error: Error, granted: ISubscriptionGrant[]) => {
        if (error) {
          Log.error(
            "Error while subscribing to MQTT: " + JSON.stringify(error)
          );
        } else {
          Log.debug("MQTT subscription success: " + JSON.stringify(granted));
        }
      }
    );
  }

  onMQTTMessage(topic: string, message: string): void {
    let jsonMessage: MQTTMessage;
    try {
      jsonMessage = JSON.parse(message);
    } catch (error) {
      jsonMessage = {};
    }

    const topicArray = topic.split("/");
    const thingId = topicArray[2];

    // Update property /things/:thingId/properties/:propertyId/update
    if (ThingMQTTClient.propertyUpdateRegEx.test(topic)) {
      if (
        jsonMessage.property !== undefined &&
        jsonMessage.property.id === topicArray[4]
      ) {
        this.updatePropertyValues(
          thingId,
          jsonMessage.requestId,
          jsonMessage.property,
          this.client
        );
        return;
      } else {
        this.client.publish(
          "/things/" + thingId + "/log",
          JSON.stringify({
            level: "error",
            error: "Missing or malformed property to update its values",
            requestId: jsonMessage.requestId,
          })
        );
        return;
      }
    }

    // Create property /things/:thingId/properties/create
    if (ThingMQTTClient.propertyCreateRegEx.test(topic)) {
      this.createProperty(
        thingId,
        jsonMessage.requestId,
        jsonMessage.property,
        this.client
      );
      return;
    }

    // Read thing /things/:thingId/read
    if (ThingMQTTClient.thingReadRegEx.test(topic)) {
      this.readThing(thingId, jsonMessage.requestId, this.client);
      return;
    }

    if (ThingMQTTClient.thingLogsRegEx.test(topic)) {
      // ignore logs for each things
      return;
    }

    if (ThingMQTTClient.thingDataRegEx.test(topic)) {
      // ignore logs for each things
      return;
    }

    Log.debug("No implementation of " + topic);
  }

  async createProperty(
    thingId: string,
    requestId: string,
    dtoProperty: DTOProperty,
    client: MqttClient
  ): Promise<void> {
    try {
      const thing = await this.thingService.getOneThingById(thingId);
      const property: Property = await this.propertyService.createNewProperty(
        thing,
        dtoProperty
      );
      client.publish(
        "/things/" + thingId + "/reply",
        JSON.stringify({ property: property, requestId: requestId })
      );
    } catch (error) {
      client.publish(
        "/things/" + thingId + "/log",
        JSON.stringify({ level: "error", error: error, requestId: requestId })
      );
    }
  }

  async updatePropertyValues(
    thingId: string,
    requestId: string,
    property: Property,
    client: MqttClient
  ): Promise<MqttClient> {
    try {
      const retrievedProperty = await this.propertyService.getOnePropertyById(
        thingId,
        property.id
      );
      retrievedProperty.values = property.values;
      await this.propertyService.updatePropertyValues(retrievedProperty);
      return client.publish(
        "/things/" + thingId + "/log",
        JSON.stringify({
          level: "debug",
          message: "Property value updated",
          code: 0,
          requestId: requestId,
        })
      );
    } catch (error) {
      console.log(error);
      Log.error(error);
      return client.publish(
        "/things/" + thingId + "/log",
        JSON.stringify({ level: "error", error: error, requestId: requestId })
      );
    }
  }

  async readThing(
    thingId: string,
    requestId: string,
    client: MqttClient
  ): Promise<MqttClient> {
    try {
      const result = await this.thingService.getOneThingById(thingId);
      return client.publish(
        "/things/" + thingId + "/reply",
        JSON.stringify({ thing: result, requestId: requestId })
      );
    } catch (error) {
      Log.error(error);
      return client.publish(
        "/things/" + thingId + "/log",
        JSON.stringify({ level: "error", error: error, requestId: requestId })
      );
    }
  }
}
