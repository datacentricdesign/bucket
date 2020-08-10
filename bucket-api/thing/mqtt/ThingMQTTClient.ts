import * as mqtt from 'mqtt'
import { DCDError, DTOProperty } from '@datacentricdesign/types'
import { PropertyService } from '../property/PropertyService'
import PropertyController from '../property/PropertyController'
import { MqttClient } from 'mqtt'
import { Property } from '../property/Property'

/**
 * This class set up an MQTT client as Bucket MQTT API,
 * listening to /things#
 */
export class ThingMQTTClient {

  private port:number
  private host:string
  private settings:any
  private client:MqttClient

  constructor(settings:any) {
    this.port = settings.port
    this.host = settings.host
    this.settings = settings.client
  }

  connect() {
    const url = 'mqtt://' + this.host + ':' + this.port;
    console.log('MQTT connect: ' + url);
    this.client = mqtt.connect(url, this.settings);
    this.client.on('connect', onMQTTConnect.bind(this));
    this.client.on('message', onMQTTMessage.bind(this));
    return Promise.resolve()
  }
}

/**
 *
 */
function onMQTTConnect() {
  console.log('Bucket connected to MQTT: ' + this.client.connected);
  this.client.subscribe('/things/#', (error: Error, result:any) => {
    if (error) {
      console.log('Error while subscribing to MQTT: ' + JSON.stringify(error));
    } else {
      console.log('MQTT subscription success: ' + JSON.stringify(result));
    }
  });
}

/**
 *
 * @param topic
 * @param message
 */
function onMQTTMessage(topic:string, message:string) {
  let jsonMessage: any;
  try {
    jsonMessage = JSON.parse(message);
  } catch (error) {
    return console.error(error.message);
  }

  // Create property /things/:thingId/properties
  const topicArray = topic.split('/');
  if (topicArray.length === 4 && topicArray[1] === 'things' && topicArray[3] === 'properties') {
      return createProperty(topicArray[2], jsonMessage, this.client)
  }

  if (topicArray.length === 5 && topicArray[1] === 'things' && topicArray[3] === 'properties') {
    if (jsonMessage.id === topicArray[4]) {
      return updatePropertyValues(topicArray[2], jsonMessage, this.client)
    }
  }

  if (topicArray.length === 4 && topicArray[1] === 'things' && topicArray[3] === 'logs') {
    // ignore logs for each things
    return
  }

  console.log("No implementation of " + topic)
}

function createProperty(thingId:string, dtoProperty: DTOProperty, client) {
  PropertyController.propertyService.createNewProperty(thingId, dtoProperty)
  .then((result) => {
    client.publish('/things/' + thingId + '/logs', JSON.stringify({'debug': result, code: 0}))
  })
  .catch((error:DCDError) => {
    client.publish('/things/' + thingId + '/logs', JSON.stringify({'error': error}))
  });
}

async function updatePropertyValues(thingId: string, jsonMessage: any, client) {
  jsonMessage.thing = {id: thingId}

  try {
    const result = await PropertyController.propertyService.updatePropertyValues(jsonMessage)
    return client.publish('/things/' + thingId + '/logs', JSON.stringify({level: 'debug', 'message': 'Property value updated', code: 0}))
  } catch(error) {
    console.error(error)
    return client.publish('/things/' + thingId + '/logs', JSON.stringify({level: 'error', error: error}))
  }
}