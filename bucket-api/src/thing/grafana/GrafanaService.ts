import { httpConfig } from "../../config/httpConfig"
import { DCDError } from "@datacentricdesign/types"

import fetch, { Response } from 'node-fetch';
import config from "../../config";
import { json } from "express";
import { rejects } from "assert";
import { Property } from "../property/Property";
import { Thing } from "../Thing";
import ThingController from "../http/ThingController";
import * as btoa from 'btoa';



/**
 * Manage sync with Grafana
 */
export class GrafanaService {

  private grafanaHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: 'Bearer ' + config.grafana.apiKey
  }

  /**
   *
   */
  constructor() {

  }

  /**
   * @param {string} personId
   * @param {string} thingId
   * returns Promise
   **/
  async createThing(personId: string, thingId: string) {
    try {
      // Make sure the user gave consent by checking if there is a grafana id for this personId
      const grafanaId = await this.getGrafanaId(personId)
      console.log(grafanaId)
      // create (if not exists) a person folder, id person, name My dashboards
      const folderId = await this.createPersonFolder(personId)
      console.log(folderId)
      // lock permission for this user only, as editor
      const resultPermission = await this.setPersonFolderPermission(personId, grafanaId)
      console.log(resultPermission)
      // create a dashboard inside the user folder, with Thing name, thing id
      const thing: Thing = await ThingController.thingService.getOneThingById(thingId)
      const resultDashboard = await this.createThingDashboard(personId, thing, folderId)
      // console.log(resultDashboard)
    } catch (error) {
      return Promise.reject(error)
    }
  }

  async createPersonFolder(personId) {
    try {
      const folderUID = personId.replace('dcd:persons:','')
      const resultGet = await fetch(config.grafana.apiURL.href + '/folders/' + folderUID, {
        headers: this.grafanaHeaders,
        method: 'GET'
      });
      const jsonFolder = await resultGet.json()
      if (jsonFolder.id !== undefined) {
        return jsonFolder.id
      }
      const resultPost = await fetch(config.grafana.apiURL.href + '/folders', {
        headers: this.grafanaHeaders,
        body: JSON.stringify({ uid: personId.replace('dcd:persons:',''), title: 'Bucket Dashboards' }),
        method: 'POST'
      });
      const newJsonFolder = await resultPost.json()
      if (newJsonFolder.id !== undefined) {
        return newJsonFolder.id
      }
      return Promise.resolve(resultPost);
    }
    catch (error) {
      return Promise.reject(error);
    }
  }

  async getGrafanaId(personId: string) {
    const url = 'http://localhost:3000/grafana/api/users/search?query=' + personId.replace('dcd:persons:','')
    console.log(url)
    const headers = {
      Authorization: 'Basic ' + btoa('admin:admin')
    }
    console.log(headers)
    try {
      const result = await fetch(url, {
        headers: headers,
        method: 'GET'
      });
      const json = await result.json()
      console.log(json)
      if (json.users.length === 1) {
        return Promise.resolve(json.users[0].id)
      } else {
        return Promise.reject(new DCDError(404, "Grafana user not found"));
      }
    }
    catch (error) {
      return Promise.reject(error);
    }
  }

  async setPersonFolderPermission(personId: string, grafanaId: number) {
    try {
      const result = await fetch(config.grafana.apiURL.href + '/folders/' + personId.replace('dcd:persons:','') + '/permissions', {
        headers: this.grafanaHeaders,
        body: JSON.stringify({
          "items": [
            {
              "userId": grafanaId,
              "permission": 1
            },
          ]
        }),
        method: 'POST'
      });
      return Promise.resolve(result);
    }
    catch (error) {
      return Promise.reject(new DCDError(403, 'Not allowed: ' + error.message));
    }
  }

  async createThingDashboard(personId: string, thing: Thing, folderId: number) {
    const panels = []
    for (let i = 0; i < 1; i++) {
      panels.push(this.createPropertyPanel(thing, thing.properties[i]))
    }

    const dashboard = {
      "dashboard": {
        "id": null,
        // "uid": thing.id,
        "title": thing.name,
        "timezone": "browser",
        // "schemaVersion": 16,
        // "version": 0,
        "refresh": "25s",
        "panels": panels
      },
      "folderId": folderId,
      // "overwrite": false,
    }

    console.log(JSON.stringify(dashboard))

    try {
      const result = await fetch(config.grafana.apiURL.href + '/dashboards/db', {
        headers: this.grafanaHeaders,
        body: JSON.stringify(dashboard),
        method: 'POST'
      });
      return Promise.resolve(result);
    }
    catch (error) {
      return Promise.reject(error);
    }
  }

  createPropertyPanel(thing: Thing, property: Property) {
    const dim = property.type.dimensions
    let onlyNumbers
    for (let i = 0; i < dim.length; i++) {
      onlyNumbers = onlyNumbers && dim[i].type === 'number'
    }
    if (onlyNumbers) { // only numirical values
      return this.panelChart(thing, property)
    } else if (dim.length > 1) { // mix of types
      return this.panelTable(thing, property)
    } else {    // 1 non numerical dimension, show last value
      return this.panelSingleValue(thing, property)
    }
  }

  panelTable(property, thing) {
    const panel = {
      "datasource": "Bucket",
      "fieldConfig": {
        "defaults": {
          "custom": {
            "align": null
          },
          "mappings": [],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "color": "green",
                "value": null
              },
              {
                "color": "red",
                "value": 80
              }
            ]
          }
        },
        "overrides": []
      },
      "id": 6,
      "options": {
        "showHeader": true
      },
      "pluginVersion": "7.1.1",
      "targets": [
        {
          "property": property,
          "refId": "A",
          "thing": thing
        }
      ],
      "title": property.name,
      "type": "table"
    }
    return panel
  }

  panelChart(thing, property) {
    const panel = {
      "bars": false,
      "dashLength": 10,
      "dashes": false,
      "datasource": "Bucket",
      "fieldConfig": {
        "defaults": {
          "custom": {}
        },
        "overrides": []
      },
      "fill": 1,
      "fillGradient": 0,
      "hiddenSeries": false,
      "legend": {
        "avg": false,
        "current": false,
        "max": false,
        "min": false,
        "show": true,
        "total": false,
        "values": false
      },
      "lines": true,
      "linewidth": 1,
      "nullPointMode": "null",
      "percentage": false,
      "pluginVersion": "7.1.1",
      "pointradius": 2,
      "points": false,
      "renderer": "flot",
      "seriesOverrides": [],
      "spaceLength": 10,
      "stack": false,
      "steppedLine": false,
      "targets": [
        {
          "property": property,
          "refId": "A",
          "thing": thing
        }
      ],
      "thresholds": [],
      "timeFrom": null,
      "timeRegions": [],
      "timeShift": null,
      "title": property.name,
      "tooltip": {
        "shared": true,
        "sort": 0,
        "value_type": "individual"
      },
      "type": "graph",
      "xaxis": {
        "buckets": null,
        "mode": "time",
        "name": null,
        "show": true,
        "values": []
      },
      "yaxes": [
        {
          "format": "short",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        },
        {
          "format": "short",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        }
      ],
      "yaxis": {
        "align": false,
        "alignLevel": null
      }
    }
    return panel
  }

  panelSingleValue(thing, property) {
    const panel = {
      "datasource": "Bucket",
      "description": property.description,
      "options": {
        "colorMode": "value",
        "graphMode": "none",
        "justifyMode": "auto",
        "orientation": "auto",
        "reduceOptions": {
          "calcs": [
            "lastNotNull"
          ],
          "fields": "/^Class$/",
          "values": false
        },
        "textMode": "auto"
      },
      "pluginVersion": "7.1.1",
      "targets": [
        {
          "property": property,
          "refId": "A",
          "thing": thing
        }
      ],
      "title": "Last value of " + property.name,
      "type": "stat"
    }
    return panel
  }

}