import fetch from "node-fetch"
import config from "../../config"
import { AuthController } from "../http/AuthController"
import ThingController from "../http/ThingController"
import { Property } from "../property/Property"
import PropertyController from "../property/PropertyController"


export class DPiService {

    async generateDPiImage(dpi, thingId) {
        const url = config.env.dpiUrl + '/'

        const keys = await AuthController.authService.generateKeys(thingId)

        dpi.id = thingId
        dpi.enable_SSH = dpi.enable_SSH ? '1' : '0'
        dpi.private_key = keys.privateKey

        this.createOrUpdateHostnameProperty(thingId, dpi.target_hostname)

        const options = {
            method: 'POST',
            body: JSON.stringify(dpi),
            headers: {
                'Content-Type': 'application/json'
            }
        }
        const result = await fetch(url, options)
        const text = await result.text()
        return text
    }

    /**
     * Retrieve existing properties of type DNS, create a new one if none found and update the value with the hostname
     * @param thingId 
     * @param hostname
     */
    async createOrUpdateHostnameProperty(thingId: string, hostname: string) {
        const properties = await PropertyController.propertyService.getPropertiesOfAThingByType(thingId, 'DNS')
        let netProp: Property;
        if (properties.length === 0) {
            netProp = await PropertyController.propertyService.createNewProperty(thingId, {
                typeId: 'DNS'
            })
        } else {
            netProp = properties[0]
        }
        netProp.values = [[hostname, hostname + '.local', '']]
        console.log(netProp)
        await PropertyController.propertyService.updatePropertyValues(netProp)
    }
}
