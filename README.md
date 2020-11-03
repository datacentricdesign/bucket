<img src="https://raw.githubusercontent.com/datacentricdesign/bucket/develop/bucket-ui/src/assets/img/bucket-logo.svg" width="200">

# [Bucket](https://datacentricdesign.org/tools/bucket)

A bucket of data, in the cloud.

![version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![license](https://img.shields.io/badge/license-MIT-blue.svg)
[![GitHub issues open](https://img.shields.io/github/issues/datacentricdesign/bucket.svg?maxAge=2592000)]()
[![GitHub issues closed](https://img.shields.io/github/issues-closed-raw/datacentricdesign/bucket.svg?maxAge=2592000)]()

![Docker Cloud Build Status (UI)](https://img.shields.io/docker/cloud/build/datacentricdesign/bucket-ui?label=docker%20build%20%28ui%29)
![Docker Cloud Build Status (API)](https://img.shields.io/docker/cloud/build/datacentricdesign/bucket-api?label=docker%20build%20%28api%29)

[Bucket page](https://dwd.tudelft.nl/bucket)


# Developer 

Note: local deployment will only work through 'localhost', any other domain will fail to authenticate.
It means that you cannot use this deployment for external devices like phone or Arduino.

## Deployment with Docker Compose

To run bucket locally with docker-compose:

1. Copy development.env in .env
2. Run docker-compose

```
docker-compose up -d
```

You can access bucket-ui on [http://localhost:4200/bucket](http://localhost:4200/bucket)
You can access bucket-api on [http://localhost:8081/bucket/api](http://localhost:8081/bucket/api)

To look at the latest logs (tail for online the last x lines, f for listening to incoming logs):

```sh
docker logs bucket-api --tail=1000 -f
docker logs bucket-ui --tail=1000 -f
```

## Test with Postman

You can import in Postman the environment (local and cloud) and the API collection from the subfolder bucket-api/postman.

## HTTP API

Documentation for the REST API is available [here](https://dwd.tudelft.nl/bucket/api/docs)

## MQTT API

The MQTT API follow the structure of the REST API. The verb is placed at the end.

Each published payload must be JSON format and content a requestId. This request id is an identifier
of your choice. It is added to responses and logs to recognise what it relates to.

### Publishing:

* Create property /things/:thingId/properties/create
Payload: {"requestId": "myId", "property": {"name": "Prop name", "typeId": "ACCELEROMETER"}}

Response on /things/:thingId/reply
Payload: {"requestId": "myId", "property": Property}

* Update property /things/:thingId/properties/:propertyId/update
Payload: {"requestId": "myId", "property": {"id": "dcd:properties:....", "values": [[ timestamp, val, val ], [ timestamp, val, val ]]}}

* Read thing /things/:thingId/read
Payload: {"requestId": "myId"}

Response on /things/:thingId/reply
Payload: {"requestId": "myId", "thing": Thing}

### Subscribing:

* Logs /things/:thingId/log
* Request's response /things/:thingId/reply
