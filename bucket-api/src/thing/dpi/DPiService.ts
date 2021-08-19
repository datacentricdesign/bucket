import fetch from "node-fetch";
import config from "../../config";
import { Property } from "../property/Property";
import { PropertyService } from "../property/PropertyService";
import { AuthService } from "../../auth/AuthService";
import { ThingService } from "../ThingService";

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
  private authService: AuthService;
  private thingService: ThingService;

  private constructor() {
    this.propertyService = PropertyService.getInstance();
    this.authService = AuthService.getInstance();
    this.thingService = ThingService.getInstance();
  }

  async generateDPiImage(dpi: DPI, thingId: string): Promise<string> {
    const url = config.env.dpiUrl + "/";

    const keys = await this.authService.generateKeys(thingId);

    dpi.id = thingId;
    dpi.enable_SSH = dpi.enable_SSH ? "1" : "0";
    dpi.private_key = keys.privateKey;

    this.createOrUpdateHostnameProperty(thingId, dpi.target_hostname);

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
    thingId: string,
    hostname: string
  ): Promise<void> {
    const properties = await this.propertyService.getPropertiesOfAThingByType(
      thingId,
      "DNS"
    );
    let netProp: Property;
    if (properties.length === 0) {
      const thing = await this.thingService.getOneThingById(thingId);
      netProp = await this.propertyService.createNewProperty(thing, {
        typeId: "DNS",
      });
    } else {
      netProp = properties[0];
    }
    netProp.values = [[Date.now(), hostname, hostname + ".local", ""]];
    await this.propertyService.updatePropertyValues(netProp);
  }
}
