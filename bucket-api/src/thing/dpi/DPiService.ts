import fetch from "node-fetch";
import config from "../../config";
import AuthController from "../http/AuthController";
import Property from "../property/Property";
import PropertyService from "../property/PropertyService";
import Thing from "../Thing";

export interface DPI {
  id: string;
  enable_SSH: string;
  private_key: string;
  target_hostname: string;
}

export class DPiService {
  private static instance: DPiService;

  public static getInstance(): DPiService {
    if (DPiService.instance === undefined) {
      DPiService.instance = new DPiService();
    }
    return DPiService.instance;
  }

  private propertyService: PropertyService;

  constructor() {
    PropertyService.getInstance(this).then((service) => {
      this.propertyService = service;
    });
  }

  async generateDPiImage(dpi: DPI, thing: Thing): Promise<string> {
    const url = `${config.env.dpiUrl}/`;

    const keys = await AuthController.authService.generateKeys(thing.id);

    dpi.id = thing.id;
    dpi.enable_SSH = dpi.enable_SSH ? "1" : "0";
    dpi.private_key = keys.privateKey;

    this.createOrUpdateHostnameProperty(thing, dpi.target_hostname);

    const options = {
      method: "POST",
      body: JSON.stringify(dpi),
      headers: {
        "Content-Type": "application/json",
      },
    };
    const result = await fetch(url, options);
    const text = await result.text();
    return text;
  }

  /**
   * Retrieve existing properties of type DNS, create a new one if none found and update the value with the hostname
   * @param thingId
   * @param hostname
   */
  async createOrUpdateHostnameProperty(
    thing: Thing,
    hostname: string
  ): Promise<void> {
    const properties = await this.propertyService.getPropertiesOfAThingByType(
      thing.id,
      "DNS"
    );
    let netProp: Property;
    if (properties.length === 0) {
      netProp = await this.propertyService.createNewProperty(thing, {
        typeId: "DNS",
      });
    } else {
      netProp = properties[0];
    }
    netProp.values = [[Date.now(), hostname, `${hostname}.local`, ""]];
    await this.propertyService.updatePropertyValues(netProp);
  }
}
