import { Property } from "../Property";
import * as gpmfExtract from 'gpmf-extract';
import * as goproTelemetry from 'gopro-telemetry';
import * as moment from 'moment';
import { PropertyService } from "../PropertyService";
import { ActionPropertyType } from "./ActionPropertyType";
import config from "../../../config";
import { Thing } from "../../Thing";
import { Log } from "../../../Logger";
import * as fs from 'fs'

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
                const timestamp = property.values[i][0] as number;
                const path = `${config.hostDataFolder}/files/${property.thing.id}-${property.id}-${timestamp}#${property.type.dimensions[1].id}${property.type.dimensions[1].unit}`;
                Log.debug(path);
                const gpmf = await this.extractGPMF(path)
                const telemetry = await this.extractTelemetry(gpmf);
                Log.debug('extracted telemetry' + telemetry['1']['streams'].length);
                let actualTimestamp = 0;
                let actualDuration = 0;
                for (const key in telemetry['1']['streams']) {
                    if (telemetry['1']['streams'].hasOwnProperty(key)) {
                        const prop = await this.findOrCreateProperty(property.thing, key)
                        const samples = telemetry['1']['streams'][key]['samples']
                        await this.pushTelemetryToProperty(key, prop, samples);
                        if (actualTimestamp === 0) {
                            actualTimestamp = samples[0].date.getTime()
                            actualDuration = Math.floor(samples[samples.length - 1].cts)
                        }
                    }
                }
                if (timestamp !== actualTimestamp) {
                    this.updateVideoTimestamp(property, timestamp, actualTimestamp, actualDuration)
                }
            }
        } catch (error) {
            return Promise.reject(error)
        }
        return Promise.resolve()
    }

    async updateVideoTimestamp(property: Property, oldTimestamp: number, newTimestamp: number, duration: number) {
        const oldPath = `${config.hostDataFolder}/files/${property.thing.id}-${property.id}-${oldTimestamp}#${property.type.dimensions[1].id}${property.type.dimensions[1].unit}`;
        const newPath = `${config.hostDataFolder}/files/${property.thing.id}-${property.id}-${newTimestamp}#${property.type.dimensions[1].id}${property.type.dimensions[1].unit}`;
        // rename file with new timestamp
        fs.rename(oldPath, newPath, async () => {
            Log.debug("File Renamed!");
            // create new datapoint with timestamp and duration
            const copiedProperty = Object.assign({}, property)
            copiedProperty.values = [[newTimestamp, duration, `${property.thing.id}-${property.id}-${newTimestamp}#${property.type.dimensions[1].id}${property.type.dimensions[1].unit}`]]
            await this.propertyService.updatePropertyValues(copiedProperty)
            // delete old datapoint
            await this.propertyService.deleteDataPoints(property.thing.id, property.id, [oldTimestamp]);
          });
    }

    async findOrCreateProperty(thing: Thing, key: string): Promise<Property> {
        Log.debug('## ## ## find or create property for ' + key)
        if (this.MAP_GO_PRO_PROPERTIES.hasOwnProperty(key)) {
            const properties = await this.propertyService.getPropertiesByTypeId(thing.id, this.MAP_GO_PRO_PROPERTIES[key].typeId);
            if (properties === undefined || properties.length === 0) {
                Log.debug('## ## ## property id not found ' + key)
                const newProperty = await this.propertyService.createNewProperty(thing, { name: this.MAP_GO_PRO_PROPERTIES[key].name, typeId: this.MAP_GO_PRO_PROPERTIES[key].typeId })
                Log.debug('## ## ## new property ')
                Log.debug(newProperty)
                return newProperty;
            } else {
                Log.debug('## ## ## existing property ')
                Log.debug(properties[0])
                return properties[0];
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
        return gpmfExtract(fs.readFileSync(path), { browserMode: false, progress, cancellationToken });
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