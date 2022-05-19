import { Property } from "../Property";
import * as gpmfExtract from 'gpmf-extract';
import * as goproTelemetry from 'gopro-telemetry';
import * as moment from 'moment';
import { PropertyService } from "../PropertyService";
import { ActionPropertyType } from "./ActionPropertyType";
import config from "../../../config";
import { Thing } from "../../Thing";
import { Log } from "../../../Logger";

export class ActionPropertyTypeVideo implements ActionPropertyType {

    private propertyService: PropertyService;

    constructor(propertyService: PropertyService) {
        this.propertyService = propertyService;
    }

    private MAP_GO_PRO_PROPERTIES = {
        'ACCL': { name: 'Accelerometer', typeId: 'ACCELEROMETER' },
        'GYRO': { name: 'Gyroscope', typeId: 'GYROSCOPE' },
        'MAGN': { name: 'Magnetometer', typeId: 'MAGNETIC_FIELD' },
        'SHUT': { name: 'Exposure Time', typeId: 'EXPOSURE_TIME' },
        'WBAL': { name: 'White Balance temperature', typeId: 'WHITE_BALANCE_TEMPERATURE' },
        'WRGB': { name: 'White Balance RGB gains', typeId: 'WHITE_BALANCE_RGB_GAINS' },
        'ISOE': { name: 'Sensor ISO', typeId: 'SENSOR_ISO' },
        'YAVG': { name: 'Average luminance', typeId: 'AVERAGE_LUMINANCE' },
        'UNIF': { name: 'Image Uniformity', typeId: 'IMAGE_UNIFORMITY' },
        'SCEN': { name: 'Scene Classification', typeId: 'SCENE_CLASSIFICATION' },
        'HUES': { name: 'Predominant Hues', typeId: 'PREDOMINANT_HUES' },
        'GPS5': { name: 'GPS 5', typeId: 'GPS5' },
        'CORI': { name: 'Camera Orientation', typeId: 'CAMERA_ORIENTATION' },
        'IORI': { name: 'Image Orientation', typeId: 'IMAGE_ORIENTATION' },
        'GRAV': { name: 'Gravity Vector', typeId: 'GRAVITY' },
        'WNDM': { name: 'Wind Processing', typeId: 'WIND_PROCESSING' },
        'MWET': { name: 'Microphone Wet', typeId: 'MICROPHONE_WET' },
        'AALP': { name: 'AGC Audio Level', typeId: 'AGC_AUDIO_LEVEL' },
        'FACE1': { name: 'Face Coordinates and Details', typeId: 'FACE_COORDINATES_DETAILS' }
    }

    /**
     * When new values are received, scan the videos for telemetry,
     * extract them and push the values in respective properties.
     * @param property containing the values
     * @returns 
     */
    async onValuesUpdated(property: Property): Promise<void> {
        try {
            for (let i = 0; i < property.values.length; i++) {
                const path = `${config.hostDataFolder}/files/${property.thing.id}-${property.id}-${property.values[i][0]}#${property.type.dimensions[1].id}${property.type.dimensions[1].unit}`;
                Log.debug(path);
                const gpmf = await this.extractGPMF(path)
                const telemetry = await this.extractTelemetry(gpmf);
                for (const key in telemetry) {
                    if (telemetry.hasOwnProperty(key)) {
                        const prop = await this.findOrCreateProperty(property.thing, key)
                        await this.pushTelemetryToProperty(key, prop, telemetry[key]['samples']);
                    }
                }

            }
        } catch (error) {
            return Promise.reject(error)
        }
        return Promise.resolve()
    }

    async findOrCreateProperty(thing: Thing, key): Promise<Property> {
        if (this.MAP_GO_PRO_PROPERTIES.hasOwnProperty(key)) {
            const properties = await this.propertyService.getPropertiesByTypeId(thing.id, this.MAP_GO_PRO_PROPERTIES[key].typeId);
            if (properties === undefined || properties.length === 0) {
                return await this.propertyService.createNewProperty(thing, { name: this.MAP_GO_PRO_PROPERTIES[key].name, typeId: this.MAP_GO_PRO_PROPERTIES[key].typeId })
            } else {
                return properties[0]
            }
        } else {
            Log.warn('unknown key: ' + key)
        }
    }

    async extractGPMF(path: string): Promise<void> {
        const progress = (percent: number) => {
            console.log(percent);
        }
        const cancellationToken = { cancelled: false };
        return gpmfExtract(path, { browserMode: false, progress, cancellationToken });
    }

    async extractTelemetry(gpmf) {
        if (!gpmf) return;
        Log.debug('Length of data received: ' + gpmf.rawData.length)
        Log.debug('Framerate of data received:' + (1 / gpmf.timing.frameDuration))
        const input = { rawData: gpmf.rawData, timing: gpmf.timing };
        const options = { repeatSticky: true };
        return goproTelemetry(input, options)
    }


    async pushTelemetryToProperty(key: string, property: Property, telemetrySamples: any): Promise<void> {
        property.values = [];
        const max_chunk = 500;
        for (let i = 0; i < telemetrySamples.length; i++) {
            const sample = telemetrySamples[i]['value'];
            const ts = moment(telemetrySamples[i]['date'], 'YYYY-MM-DDTHH:mm:ss.SSSZ').valueOf();
            if (['ACCL', 'GYRO', 'MAGN'].indexOf(key) >= 0) {
                property.values.push([ts, sample[1], sample[2], sample[0]]);
            } else if (['WRGB', 'SCEN', 'HUES', 'GPS5', 'CORI', 'IORI', 'GRAV', 'FACE1'].indexOf(key) >= 0) {
                sample.unshift(ts)
                property.values.push(sample);
            } else {
                property.values.push([ts, sample]);
            }

            if (i % max_chunk === 0) {
                await this.propertyService.updatePropertyValues(property)
                    .then(async res => {
                        Log.debug('pushed up to ' + i)
                    })
                    .catch(error => {
                        Log.error(error)
                    })
                property.values = []
            }
        }
        if (property.values.length > 0) {
            return this.propertyService.updatePropertyValues(property)
                .then(() => {
                    return Promise.resolve()
                })
                .catch(error => {
                    return Promise.reject(error)
                })
        } else {
            return Promise.resolve();
        }
    }

}