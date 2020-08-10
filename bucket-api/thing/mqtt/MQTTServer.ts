import * as Aedes from 'aedes'
import { Subscription, PublishPacket } from 'aedes'
import * as fs from 'fs'
import * as tls from 'tls'
import * as net from 'net'
import config from '../../config'
import { ThingMQTTClient } from './ThingMQTTClient'
import { Context, DCDError } from '@datacentricdesign/types'
import { httpConfig } from '../../config/httpConfig'
import { AuthController } from '../http/AuthController'
import PropertyController from '../property/PropertyController'
import { Property } from '../property/Property'

interface Client extends Aedes.Client {
  context: Context
}

const authorizePublish: Aedes.AuthorizePublishHandler = async (client: Client, packet: PublishPacket, callback: Function) => {
  if (client.context.userId === config.mqtt.client.username) {
    return callback(null)
  }

  let resource = 'dcd:' + packet.topic.substr(1).split('/').join(':')
  if (resource.startsWith('dcd:things:dcd:things:')) {
    resource = resource.replace('dcd:things:dcd:things:', 'dcd:things:')
  }

  const acp = {
    action: 'dcd:actions:update',
    resource: resource,
    subject: client.context.userId
  }

  try {
    await AuthController.policyService.check(acp)
    callback(null)
  } catch(errorResult) {
      console.debug(JSON.stringify(errorResult))
      const error = new DCDError(4031, 'NOT authorised to publish on ' + packet.topic)
      callback(error)
  }
}

const authorizeSubscribe: Aedes.AuthorizeSubscribeHandler = async (client: Client, packet: Subscription, callback: Function) => {
  if (client.context.userId === config.mqtt.client.username) {
    return callback(null, packet)
  }

  let resource = 'dcd:'
    + packet.topic.substr(1).split('/').join(':').replace('#', '<.*>')
  if (resource.startsWith('dcd:things:dcd:things:')) {
    resource = resource.replace('dcd:things:dcd:things:', 'dcd:things:')
  }

  const acp = {
    action: 'dcd:actions:read',
    resource: resource,
    subject: client.context.userId
  }

  try {
    await AuthController.policyService.check(acp)
    callback(null, packet)
  } catch(errorResult) {
      console.error('error subscribe keto')
      console.error(errorResult)
      const error = new DCDError(4031, 'Subscription denied to ' + packet.topic)
      console.debug(JSON.stringify(error))
      callback(error)
  }
}

const authenticate: Aedes.AuthenticateHandler = (client: Client, username: string, password: Buffer, callback: Function) => {
  console.log('authenticate with credentials: ' + username)
  if (username === config.mqtt.client.username) {
    console.log('DCD client mqtt')
    client.context = {
      userId: username
    }
    // client.user.token = password
    return callback(null, true)
  } else {
    console.log('NOT DCD client mqtt')
  }

  AuthController.authService.checkJWTAuth(password.toString(), username)
    .then(() => {
      client.context = {
        userId: username
      }
      callback(null, true)
    })
    .catch((error:DCDError) => {
      console.error(error)
      callback(error, false)
    })
}

const aedes = Aedes({authenticate, authorizePublish, authorizeSubscribe})

let server: any

if (httpConfig.secured === 'true') {
  const options = {
    key: fs.readFileSync(config.mqtt.secure.keyPath),
    cert: fs.readFileSync(config.mqtt.secure.certPath)
  }
  server = tls.createServer(options, aedes.handle)
} else {
  server = net.createServer(aedes.handle)
}

export const mqttInit = () => {
  server.listen(config.mqtt.port, function () {
    console.log('server started and listening on port ', config.mqtt.port)
    const mqttClient = new ThingMQTTClient(config.mqtt)
    return mqttClient.connect()
  })
}

aedes.on('clientReady', (client: Client) => {
  console.log('New connection: ' + client.id)
  updateStatusProperty(client as Client, "Connected")
})

aedes.on('subscribe', (result) => {
  console.log('subscribed')
  console.log(result)
})

aedes.on('closed', () => {
  console.log('closed')
})

aedes.on('ping', (packet, client) => {
  console.log('ping')
  updateStatusProperty(client as Client, "Ping")
})

aedes.on('clientDisconnect', (client) => {
  console.log('clientDisconnect')
  updateStatusProperty(client as Client, "Disconnected")
})

function updateStatusProperty(client: Client, status:string) {
  console.log('update status property...')
  if (client.context.userId.startsWith('dcd:things:')) {
    findOrCreateMQTTStatusProperty(client.context.userId)
      .then( (property: Property) => {
        property.values = [[new Date().getTime(),status]]
        PropertyController.propertyService.updatePropertyValues(property)
      })
      .catch( (error) => {
        console.log(error)
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