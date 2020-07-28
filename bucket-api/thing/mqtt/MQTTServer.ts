import * as Aedes from 'aedes'
import { Subscription, PublishPacket } from 'aedes'
import * as fs from 'fs'
import * as tls from 'tls'
import * as net from 'net'
import * as ws from 'websocket-stream'
import config from '../../config'
import { ThingMQTTClient } from './ThingMQTTClient'
import { Context } from '@datacentricdesign/types'

interface Client extends Aedes.Client {
  context: Context
}

const aedes = Aedes()

let server: any

if (process.env.HTTPS === 'true') {
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

server.on('clientReady', (client: Client) => {
  console.log('New connection: ' + client.id)
})

server.on('subscribed', () => {
  console.log('subscribed')
})

// if (process.env.WS === 'true') {
//   const httpServer = require('http').createServer()
//   const port = 8888

//   ws.createServer({ server: httpServer }, aedes.handle)

//   httpServer.listen(port, function () {
//     console.log('websocket server listening on port ', port)
//   })
// }

server.authorizePublish = (client: Client, packet: PublishPacket, callback: Function) => {
  console.log('Authorising to publish on ' + packet.topic)
  if (client.context.userId === config.mqtt.client.username) {
    return callback(null, true)
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
  console.log(acp)

  return callback(null, true)

  // model.policies.check(acp)
  //   .then(() => {
  //     console.log('authorised to publish on ' + packet.topic)
  //     callback(null, true)
  //   })
  //   .catch(() => {
  //     const message = 'NOT authorised to publish on ' + packet.topic
  //     console.error(message)
  //     callback(new Error(message), false)
  //   })
}

server.authorizeSubscribe = (client: Client, packet: Subscription, callback: Function) => {
  console.log('Authorising to subscribe on ' + packet.topic)
  if (client.context.userId === this.settings.client.username) {
    return callback(null, true)
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

  return callback(null, true)

  // model.policies.check(acp)
  //   .then(() => {
  //     console.log('authorised to subscribe on ' + packet.topic)
  //     callback(null, true)
  //   })
  //   .catch(() => {
  //     const message = 'Subscription denied to ' + packet.topic
  //     callback(new Error(message), false)
  //   })
}

server.authenticate = (client: Client, username: string, password: Buffer, callback: Function) => {
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

  if (config.env.env === 'development') {
    client.context = {
      userId: config.env.devUser
    }
    // client.user.token = config.env.devToken
    return callback(null, true)
  }

  // model.auth.checkJWTAuth(password, username)
  //   .then(() => {
  //     client.user = {}
  //     client.user.subject = username
  //     client.user.token = password
  //     callback(null, true)
  //   })
  //   .catch((error) => {
  //     console.error(error)
  //     callback(error, false)
  //   })
}
