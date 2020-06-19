import * as mqtt from 'mqtt'

/**
 * This class set up an MQTT client as Bucket MQTT API,
 * listening to /things#
 */
export class ThingMQTTClient {

  private port:number
  private host:string
  private settings:any
  private client:any

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
  console.log('Subscriber connected: ' + this.client.connected);
  this.client.subscribe('/things/#', (result) => {
    console.log('result subscribe');
    console.log(result);
  });
}

/**
 *
 * @param topic
 * @param message
 */
function onMQTTMessage(topic, message) {
  console.log('received: ' + message);
  let jsonMessage;
  try {
    jsonMessage = JSON.parse(message);
  } catch (error) {
    return console.error(error.message);
  }

  const topicArray = topic.split('/');
  if (topicArray.length === 5 && topicArray[1] === 'things' && topicArray[3] === 'properties') {
    if (jsonMessage.id === topicArray[4]) {
      console.log('update property');
      jsonMessage.entityId = topicArray[2];
      this.model.properties.updateValues(jsonMessage)
        .then((result) => {
          console.log(result);
        })
        .catch((error) => console.error(error));
    }
  }
}
