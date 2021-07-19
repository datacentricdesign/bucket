import * as Aedes from 'aedes'
import { Subscription, PublishPacket } from 'aedes'
import * as fs from 'fs'
import * as tls from 'tls'
import * as net from 'net'
import config from '../../config'
import { ThingMQTTClient } from './ThingMQTTClient'
import { Context, DCDError } from '@datacentricdesign/types'
import { AuthController } from '../http/AuthController'
import PropertyController from '../property/PropertyController'
import { Property } from '../property/Property'
import { Log } from '../../Logger'

interface Client extends Aedes.Client {
  context: Context,
  tokenExpiryTime: number
}

const authorizePublish: Aedes.AuthorizePublishHandler = async (client: Client, packet: PublishPacket, callback: Function) => {
  Log.debug('publish')
  if (client.context.userId === config.mqtt.client.username) {
    return callback(null)
  }

  // Check that the token is still valid
  if (!accessIsStillValid(client)) {
    callback(new DCDError(403, 'Token expired'));
    return client.close();
  }

  let topicArray = packet.topic.substr(1).split('/')
  let action = 'dcd:actions:update'
  if (topicArray.length > 0 && topicArray.length > 0 && (topicArray[topicArray.length - 1] === 'log' || topicArray[topicArray.length - 1] === 'reply')) {
    action = 'dcd:actions:' + topicArray.pop()
  }

  let resource = 'dcd:' + topicArray.join(':')
  if (resource.startsWith('dcd:things:dcd:things:')) {
    resource = resource.replace('dcd:things:dcd:things:', 'dcd:things:')
  }

  const acp = {
    action: action,
    resource: resource,
    subject: client.context.userId
  }

  try {
    await AuthController.policyService.check(acp)
    callback(null)
  } catch (errorResult) {
    Log.debug(JSON.stringify(errorResult))
    const error = new DCDError(4031, 'NOT authorised to publish on ' + packet.topic)
    callback(error)
  }
}

const authorizeSubscribe: Aedes.AuthorizeSubscribeHandler = async (client: Client, packet: Subscription, callback: Function) => {
  if (client.context.userId === config.mqtt.client.username) {
    return callback(null, packet)
  }

  // Check that the token is still valid
  if (!accessIsStillValid(client)) {
    callback(new DCDError(403, 'Token expired'));
    return client.close();
  }

  let topicArray = packet.topic.substr(1).split('/')
  let action = 'dcd:actions:read'
  if (topicArray.length > 0 && (topicArray[topicArray.length - 1] === 'log' || topicArray[topicArray.length - 1] === 'reply')) {
    action = 'dcd:actions:' + topicArray.pop()
  }

  let resource = 'dcd:' + topicArray.join(':').replace('#', '<.*>')
  if (resource.startsWith('dcd:things:dcd:things:')) {
    resource = resource.replace('dcd:things:dcd:things:', 'dcd:things:')
  }

  const acp = {
    action: action,
    resource: resource,
    subject: client.context.userId
  }



  try {
    await AuthController.policyService.check(acp)
    callback(null, packet)
  } catch (errorResult) {
    const error = new DCDError(4031, 'Subscription denied to ' + packet.topic)
    Log.error(errorResult)
    Log.debug(JSON.stringify(error))
    if (resource.includes(":properties:dcd:")) {
      const consents = await AuthController.policyService.listConsents("resource", 'dcd:' + resource.split(":properties:dcd:")[1])
      for (let i = 0; i < consents.length; i++) {
        const consent = consents[i]
        for (let j = 0; j < consent.subjects.length; j++) {
          try {
            await AuthController.policyService.checkGroupMembership(acp.subject, consent.subjects[j])
            return callback(null, packet)
          } catch (error) {
            console.log(error)
          }
        }
      }
    }

    return callback(error)
  }
}

const authenticate: Aedes.AuthenticateHandler = (client: Client, username: string, password: Buffer, callback: Function) => {
  Log.debug('authenticate with credentials: ' + username)
  if (username === config.mqtt.client.username) {
    Log.debug('DCD client mqtt')
    client.context = {
      userId: username
    }
    return callback(null, true)
  } else {
    Log.debug('NOT DCD client mqtt')
  }

  if (password === undefined) {
    return callback(new DCDError(403, 'Missing token in the password field.'), false)
  }
  AuthController.authService.checkJWTAuth(password.toString(), username)
    .then((token: any) => {
      client.context = {
        userId: username
      }
      client.tokenExpiryTime = token.exp
      callback(null, true)
    })
    .catch((error: DCDError) => {
      Log.error(error)
      callback(error, false)
    })
}

const aedes = Aedes({ authenticate, authorizePublish, authorizeSubscribe })

let server: any

if (config.http.secured) {
  Log.debug('Starting mqtts server over SSL...')
  const options = {
    key: fs.readFileSync(config.mqtt.secure.keyPath),
    cert: fs.readFileSync(config.mqtt.secure.certPath)
  }
  server = tls.createServer(options, aedes.handle)
} else {
  Log.info('Starting mqtt server...')
  server = net.createServer(aedes.handle)
}

export const mqttInit = () => {
  server.listen(config.mqtt.port, function () {
    Log.info('MQTT server listening on port ', config.mqtt.port)
    const mqttClient = new ThingMQTTClient(config.mqtt)
    return mqttClient.connect()
  })
}

aedes.on('clientReady', (client: Client) => {
  Log.debug('New connection: ' + client.id)
  updateStatusProperty(client as Client, "Connected")
})

aedes.on('subscribe', (result) => {
  Log.debug('subscribed, result ' + JSON.stringify(result))
})

aedes.on('closed', () => {
  Log.debug('closed')
})

aedes.on('ping', (packet, client: Client) => {
  Log.debug('ping')
  if (client.context.userId !== config.mqtt.client.username) {
    if (!accessIsStillValid(client)) {
      return client.close()
    } else {
      updateStatusProperty(client as Client, "Ping")
    }
  }
})

function accessIsStillValid(client: Client): boolean {
  Log.debug('Expiry time: ' + client.tokenExpiryTime)
  Log.debug('Current time: ' + Math.floor(Date.now() / 1000))
  return client.tokenExpiryTime > Math.floor(Date.now() / 1000)
}

aedes.on('clientDisconnect', (client) => {
  Log.debug('clientDisconnect')
  updateStatusProperty(client as Client, "Disconnected")
})

function updateStatusProperty(client: Client, status: string) {
  Log.debug('update status property...')
  if (client.context.userId.startsWith('dcd:things:')) {
    findOrCreateMQTTStatusProperty(client.context.userId)
      .then((property: Property) => {
        property.values = [[new Date().getTime(), status]]
        PropertyController.propertyService.updatePropertyValues(property)
      })
      .catch((error) => {
        Log.error(error)
      })
  }
}

/**
 * 
 * @param thingId
 */
async function findOrCreateMQTTStatusProperty(thingId: string): Promise<Property> {
  try {
    const properties = await PropertyController.propertyService.getPropertiesByTypeId(thingId, 'MQTT_STATUS')
    if (properties.length > 0) {
      return Promise.resolve(properties[0])
    }
    else {
      return PropertyController.propertyService.createNewProperty(thingId, { typeId: 'MQTT_STATUS' })
    }
  }
  catch (error) {
    return Promise.reject(error)
  }
}