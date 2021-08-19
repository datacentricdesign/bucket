import { DCDError } from "@datacentricdesign/types";

import fetch from "node-fetch";
import config from "../../config";
import { Property } from "../property/Property";
import { Thing } from "../Thing";
import * as btoa from "btoa";
import { ThingService } from "../ThingService";

interface GridPos {
  x: number;
  y: number;
  h: number;
  w: number;
}

/**
 * Manage sync with Grafana
 */
export class GrafanaService {
  private thingService: ThingService;

  constructor() {
    this.thingService = ThingService.getInstance();
  }

  private grafanaHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: "Bearer " + config.grafana.apiKey,
  };

  /**
   * @param {string} personId
   * @param {string} thingId
   * returns Promise
   **/
  async createThing(personId: string, thingId: string): Promise<void> {
    try {
      // Make sure the user gave consent by checking if there is a grafana id for this personId
      const grafanaId = await this.getGrafanaId(personId);
      // create (if not exists) a person folder, id person, name My dashboards
      const folderId = await this.createPersonFolder(personId);
      // lock permission for this user only, as editor
      await this.setPersonFolderPermission(personId, grafanaId);
      // create a dashboard inside the user folder, with Thing name, thing id
      const thing: Thing = await this.thingService.getOneThingById(thingId);
      await this.createThingDashboard(personId, thing, folderId);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async createPersonFolder(personId: string) {
    try {
      const folderUID = personId.replace("dcd:persons:", "");
      const resultGet = await fetch(
        config.grafana.apiURL.href + "/folders/" + folderUID,
        {
          headers: this.grafanaHeaders,
          method: "GET",
        }
      );
      const jsonFolder = await resultGet.json();
      if (jsonFolder.id !== undefined) {
        return jsonFolder.id;
      }
      const resultPost = await fetch(config.grafana.apiURL.href + "/folders", {
        headers: this.grafanaHeaders,
        body: JSON.stringify({
          uid: personId.replace("dcd:persons:", ""),
          title: personId.replace("dcd:persons:", ""),
        }),
        method: "POST",
      });
      const newJsonFolder = await resultPost.json();
      if (newJsonFolder.id !== undefined) {
        return newJsonFolder.id;
      }
      return Promise.resolve(resultPost);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async getGrafanaId(personId: string): Promise<number> {
    const url =
      config.grafana.apiURL.href +
      "/users/lookup?loginOrEmail=" +
      personId.replace("dcd:persons:", "");
    const headers = {
      Authorization:
        "Basic " + btoa(config.grafana.user + ":" + config.grafana.pass),
    };
    try {
      const result = await fetch(url, {
        headers: headers,
        method: "GET",
      });
      const json = await result.json();
      return Promise.resolve(json.id);
    } catch (error) {
      if (error.code === "ECONNREFUSED") {
        return Promise.reject(new DCDError(503, "Service unavailable."));
      }
      return Promise.reject(error);
    }
  }

  async setPersonFolderPermission(
    personId: string,
    grafanaId: number
  ): Promise<void> {
    try {
      await fetch(
        config.grafana.apiURL.href +
          "/folders/" +
          personId.replace("dcd:persons:", "") +
          "/permissions",
        {
          headers: this.grafanaHeaders,
          body: JSON.stringify({
            items: [
              {
                userId: grafanaId,
                permission: 2,
              },
            ],
          }),
          method: "POST",
        }
      );
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(new DCDError(403, "Not allowed: " + error.message));
    }
  }

  async createThingDashboard(
    personId: string,
    thing: Thing,
    folderId: number
  ): Promise<void> {
    const panels = [];
    const x = 0;
    let y = 0;
    const h = 6;
    const w = 24;
    for (let i = 0; i < thing.properties.length; i++) {
      panels.push(
        this.createPropertyPanel(thing, thing.properties[i], { x, y, h, w })
      );
      y += 6;
    }

    const dashboard = {
      dashboard: {
        id: null,
        uid: thing.id.replace("dcd:things:", ""),
        title: thing.name,
        timezone: "browser",
        // "schemaVersion": 16,
        // "version": 0,
        refresh: "25s",
        panels: panels,
      },
      folderId: folderId,
      // "overwrite": false,
    };

    try {
      await fetch(config.grafana.apiURL.href + "/dashboards/db", {
        headers: this.grafanaHeaders,
        body: JSON.stringify(dashboard),
        method: "POST",
      });
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  createPropertyPanel(
    thing: Thing,
    property: Property,
    gridPos: GridPos
  ): Record<string, unknown> {
    const dim = property.type.dimensions;
    let onlyNumbers = true;
    for (let i = 0; i < dim.length; i++) {
      onlyNumbers = onlyNumbers && dim[i].type === "number";
    }
    if (onlyNumbers) {
      // only numirical values
      return this.panelChart(thing, property, gridPos);
    } else if (dim.length > 1) {
      // mix of types
      return this.panelTable(thing, property, gridPos);
    } else {
      // 1 non numerical dimension, show last value
      return this.panelSingleValue(thing, property, gridPos);
    }
  }

  panelTable(
    thing: Thing,
    property: Property,
    gridPos: GridPos
  ): Record<string, unknown> {
    const panel = {
      datasource: "Bucket",
      fieldConfig: {
        defaults: {
          custom: {
            align: null,
          },
          mappings: [],
          thresholds: {
            mode: "absolute",
            steps: [
              {
                color: "green",
                value: null,
              },
              {
                color: "red",
                value: 80,
              },
            ],
          },
        },
        overrides: [],
      },
      options: {
        showHeader: true,
      },
      pluginVersion: "7.1.1",
      targets: [
        {
          property: property,
          refId: "A",
          thing: thing,
        },
      ],
      title: property.name,
      type: "table",
      gridPos: gridPos,
    };
    return panel;
  }

  panelChart(
    thing: Thing,
    property: Property,
    gridPos: GridPos
  ): Record<string, unknown> {
    const panel = {
      bars: false,
      dashLength: 10,
      dashes: false,
      datasource: "Bucket",
      fieldConfig: {
        defaults: {
          custom: {},
        },
        overrides: [],
      },
      fill: 1,
      fillGradient: 0,
      hiddenSeries: false,
      legend: {
        avg: false,
        current: false,
        max: false,
        min: false,
        show: true,
        total: false,
        values: false,
      },
      lines: true,
      linewidth: 1,
      nullPointMode: "null",
      percentage: false,
      pluginVersion: "7.1.1",
      pointradius: 2,
      points: false,
      renderer: "flot",
      seriesOverrides: [],
      spaceLength: 10,
      stack: false,
      steppedLine: false,
      targets: [
        {
          property: property,
          refId: "A",
          thing: thing,
        },
      ],
      thresholds: [],
      timeFrom: null,
      timeRegions: [],
      timeShift: null,
      title: property.name,
      tooltip: {
        shared: true,
        sort: 0,
        value_type: "individual",
      },
      type: "graph",
      xaxis: {
        buckets: null,
        mode: "time",
        name: null,
        show: true,
        values: [],
      },
      yaxes: [
        {
          format: "short",
          label: null,
          logBase: 1,
          max: null,
          min: null,
          show: true,
        },
        {
          format: "short",
          label: null,
          logBase: 1,
          max: null,
          min: null,
          show: true,
        },
      ],
      yaxis: {
        align: false,
        alignLevel: null,
      },
      gridPos: gridPos,
    };
    return panel;
  }

  panelSingleValue(
    thing: Thing,
    property: Property,
    gridPos: GridPos
  ): Record<string, unknown> {
    const panel = {
      datasource: "Bucket",
      description: property.description,
      options: {
        colorMode: "value",
        graphMode: "none",
        justifyMode: "auto",
        orientation: "auto",
        reduceOptions: {
          calcs: ["lastNotNull"],
          fields: "/^Class$/",
          values: false,
        },
        textMode: "auto",
      },
      pluginVersion: "7.1.1",
      targets: [
        {
          property: property,
          refId: "A",
          thing: thing,
        },
      ],
      title: "Last value of " + property.name,
      type: "stat",
      gridPos: gridPos,
    };
    return panel;
  }
}
