<img src="https://raw.githubusercontent.com/datacentricdesign/bucket/develop/bucket-ui/src/assets/img/bucket-logo.svg" width="200">

# [Bucket](https://dwd.tudelft.nl/bucket)

![version](https://img.shields.io/badge/version-0.1.2-blue.svg)
![license](https://img.shields.io/badge/license-MIT-blue.svg)
[![GitHub issues open](https://img.shields.io/github/issues/datacentricdesign/bucket.svg?maxAge=2592000)]()
[![GitHub issues closed](https://img.shields.io/github/issues-closed-raw/datacentricdesign/bucket.svg?maxAge=2592000)]()

![Docker Cloud Build Status (UI)](https://img.shields.io/docker/cloud/build/datacentricdesign/bucket-ui?label=docker%20build%20%28ui%29)
![Docker Cloud Build Status (API)](https://img.shields.io/docker/cloud/build/datacentricdesign/bucket-api?label=docker%20build%20%28api%29)

[![Gitter](https://badges.gitter.im/datacentricdesign/community.svg)](https://gitter.im/datacentricdesign/community?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

Bucket is a cloud application that helps collect data for Data-Centric Design processes.

# Key Concepts

A __[Thing](#api-Thing)__ represents a physical or virtual component collecting data. For example, a phone which collects acceleration, a website recording number of page views.

A __[Property](#api-Property)__ belongs to a Thing and represents an entry point for data. It enables to stream data in and out of a Thing. The PropertyType defines the structure of a property with a series of Dimensions. An example of PropertyType is 'ACCELEROMETER', a structure with three dimensions x, y and z. The Property groups these dimensions as they relate to each other and are updated at the same frequency.

A Consent is a mechanism to share properties with another Thing or with DCD Persons or Groups.

# Authentication

Most Bucket services require authentication via token placed in the `Authorization` header:

* A bearer token as a result of an OAuth2 flow

A Person relies on bearer tokens to interact with Bucket. The client (e.g. web or mobile app) must be registered as a DCD hub app.

[Tutorial develop a Python web app]

[Tutorial develop a Flutter mobile app]

* A JWT token based on public/private keys

A __[Thing](#api-Thing)__ relies on JWT tokens to interact with Bucket. The client generates a set of public and private keys and shares the public key with Bucket. It can then generate JWT tokens with the private key to authenticate itself on Bucket.

[Tutorial develop a Python Thing]

[Tutorial develop an Arduino Thing]

## Test with Postman

You can import in Postman the environment (local and cloud) and the API collection from the subfolder bucket-api/postman.

## HTTP API

Documentation for the REST API is available [here](https://dwd.tudelft.nl/bucket/api/docs)

## MQTT API

The MQTT API follow the structure of the REST API. The verb is placed at the end.

Each published payload must be JSON format and content a request ID. This request ID is an identifier
of your choice. It is added to responses and logs to recognise what it relates to.

### Publishing:

* Create property `/things/:thingId/properties/create`

Payload:

```json
{
  "requestId": "myId",
  "property": {
    "name": "Prop name",
    "typeId": "ACCELEROMETER"
  }
}
```

Response on `/things/:thingId/reply`

Payload: 

```json
{
  "requestId": "myId",
  "property": Property
}
```

* Update property `/things/:thingId/properties/:propertyId/update`

Payload:

```
{
  "requestId": "myId",
  "property": {
    "id": "dcd:properties:....",
    "values":
    [
      [ timestamp, val, val ],
      [ timestamp, val, val ]
    ]
  }
}
```

* Read thing `/things/:thingId/read`

Payload:

```json
{
  "requestId": "myId"
}
```

Response on `/things/:thingId/reply`

Payload:

```json
{
  "requestId": "myId",
  "thing": Thing
}
```

### Subscribing

* Logs: `/things/:thingId/log`
* Request's response: `/things/:thingId/reply`
