import * as mqtt from "mqtt";
import { DTOProperty } from "@datacentricdesign/types";
import PropertyController from "../property/PropertyController";
import { MqttClient } from "mqtt";
import { Property } from "../property/Property";
import config from "../../config";
import ThingController from "../http/ThingController";
import { Log } from "../../Logger";

/**
 * This class set up an MQTT client as Bucket MQTT API,
 * listening to /things#
 */
export class ThingMQTTClient {
  private port: number;
  private host: string;
  private settings: any;
  private client: MqttClient;

  constructor(settings: any) {
    this.port = settings.port;
    this.host = settings.host;
    this.settings = settings.client;
  }

  connect() {
    const url =
      "mqtt" +
      (config.http.secured ? "s" : "") +
      "://" +
      this.host +
      ":" +
      this.port;
    Log.debug("MQTT connect: " + url);
    this.client = mqtt.connect(url, this.settings);
    this.client.on("connect", onMQTTConnect.bind(this));
    this.client.on("message", onMQTTMessage.bind(this));
    return Promise.resolve();
  }
}

/**
 *
 */
function onMQTTConnect() {
  Log.debug("Bucket connected to MQTT: " + this.client.connected);
  this.client.subscribe("/things/#", (error: Error, result: any) => {
    if (error) {
      Log.error("Error while subscribing to MQTT: " + JSON.stringify(error));
    } else {
      Log.debug("MQTT subscription success: " + JSON.stringify(result));
    }
  });
}

/**
 * = = = = = = = = = = = MQTT API = = = = = = = = = = =
 */

const propertyCreateRegEx = new RegExp("/things/.*/properties/create");
const propertyUpdateRegEx = new RegExp("/things/.*/properties/.*");
const thingReadRegEx = new RegExp("/things/.*/read");
const thingLogsRegEx = new RegExp("/things/.*/log");
const thingDataRegEx = new RegExp("/things/.*/reply");

/**
 * @param topic
 * @param message
 */
function onMQTTMessage(topic: string, message: string) {
  let jsonMessage: any;
  try {
    jsonMessage = JSON.parse(message);
  } catch (error) {
    jsonMessage = {};
  }

  const topicArray = topic.split("/");
  const thingId = topicArray[2];

  // Update property /things/:thingId/properties/:propertyId/update
  if (propertyUpdateRegEx.test(topic)) {
    if (
      jsonMessage.property !== undefined &&
      jsonMessage.property.id === topicArray[4]
    ) {
      return updatePropertyValues(
        thingId,
        jsonMessage.requestId,
        jsonMessage.property,
        this.client
      );
    } else {
      return this.client.publish(
        "/things/" + thingId + "/log",
        JSON.stringify({
          level: "error",
          error: "Missing or malformed property to update its values",
          requestId: jsonMessage.requestId,
        })
      );
    }
  }

  // Create property /things/:thingId/properties/create
  if (propertyCreateRegEx.test(topic)) {
    return createProperty(
      thingId,
      jsonMessage.requestId,
      jsonMessage.property,
      this.client
    );
  }

  // Read thing /things/:thingId/read
  if (thingReadRegEx.test(topic)) {
    return readThing(thingId, jsonMessage.requestId, this.client);
  }

  if (thingLogsRegEx.test(topic)) {
    // ignore logs for each things
    return;
  }

  if (thingDataRegEx.test(topic)) {
    // ignore logs for each things
    return;
  }

  Log.debug("No implementation of " + topic);
}

async function createProperty(
  thingId: string,
  requestId: string,
  dtoProperty: DTOProperty,
  client: MqttClient
) {
  Log.debug("create property");
  Log.debug(dtoProperty);
  try {
    const property: Property =
      await PropertyController.propertyService.createNewProperty(
        thingId,
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

async function updatePropertyValues(
  thingId: string,
  requestId: string,
  property: any,
  client: MqttClient
) {
  property.thing = { id: thingId };
  console.log(thingId);
  console.log(requestId);
  console.log(property);
  console.log(client);
  try {
    const result =
      await PropertyController.propertyService.updatePropertyValues(property);
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

async function readThing(
  thingId: string,
  requestId: string,
  client: MqttClient
) {
  try {
    const result = await ThingController.thingService.getOneThingById(thingId);
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
