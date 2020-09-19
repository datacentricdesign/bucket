import { MigrationInterface, QueryRunner, getRepository } from "typeorm";
import { Log } from "../../Logger";
import { PropertyType } from "../property/propertyType/PropertyType";

export class TypesMQTT1589877780000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        
        const propertyTypes: PropertyType[] = [
            {
                id: 'ACCELEROMETER',
                name: 'Accelerometer',
                description:
                    'Acceleration force that is applied to a device on all three physical axes x, y and z, including the force of gravity.',
                dimensions: [
                    { id: 'acceleration-x', name: 'x', description: 'Acceleration force that is applied to a device on physical axe x, including the force of gravity.', unit: 'm/s2', type: 'number' },
                    { id: 'acceleration-y', name: 'y', description: 'Acceleration force that is applied to a device on physical axe y, including the force of gravity.', unit: 'm/s2', type: 'number' },
                    { id: 'acceleration-z', name: 'z', description: 'Acceleration force that is applied to a device on physical axe z, including the force of gravity.', unit: 'm/s2', type: 'number' }
                ]
            },
            {
                id: 'MQTT_STATUS',
                name: 'Network Status',
                description: 'Status of an MQTT connection.',
                dimensions: [
                    { id: 'mqtt-status-class', name: 'Class', description: 'Values of this dimension represents the classes of the property.', unit: '', type: 'string' }
                ]
            },
            {
                id: 'GYROSCOPE',
                name: 'Gyroscope',
                description: 'Rate of rotation around the three axis x, y and z.',
                dimensions: [
                    { id: 'rotation-acc-x', name: 'x', description: 'Rate of rotation around the x axis.', unit: 'rad/s', type: 'number' },
                    { id: 'rotation-acc-y', name: 'y', description: 'Rate of rotation around the y axis.', unit: 'rad/s', type: 'number' },
                    { id: 'rotation-acc-z', name: 'z', description: 'Rate of rotation around the z axis.', unit: 'rad/s', type: 'number' }
                ]
            },
            {
                id: 'TEXT',
                name: 'Text',
                description: '',
                dimensions: [{ id: 'text', name: 'Text', description: 'Textual information', unit: '', type: 'string'}]
            },
            {
                id: 'BINARY',
                name: 'Binary',
                description: 'Can take value 0 or 1.',
                dimensions: [{ id: 'state', name: 'State', description: 'Binary State', unit: '', type: 'boolean' }]
            },
            {
                id: 'LIGHT',
                name: 'Light',
                description: 'Light level',
                dimensions: [ { id: 'illuminance', name: 'Illuminance', description: '', unit: 'lx', type: 'number' } ]
            },
            {
                id: 'LOCATION',
                name: 'Location',
                description: 'Longitude and latitude in degrees',
                dimensions: [
                    { id: 'longitude', name: 'Longitude', description: '', unit: '°', type: 'number' },
                    { id: 'latitude', name: 'Latitude', description: '', unit: '°', type: 'number' }
                ]
            },
            {
                id: 'VIDEO',
                name: 'Video',
                description: '',
                dimensions: [ { id: 'video-duration', name: 'Duration', description: 'Duration of the media.', unit: 'ms', type: 'number' } ]
            },
            {
                id: 'AUDIO',
                name: 'Audio',
                description: '',
                dimensions: [ { id: 'audio-duration', name: 'Duration', description: 'Duration of the media.', unit: 'ms', type: 'number' } ]
            },
            {
                id: 'PICTURE',
                name: 'Picture',
                description: '',
                dimensions: [
                    { id: 'res-x', name: 'x', description: 'Horizontal resolution', unit: 'px', type: 'number' },
                    { id: 'res-y', name: 'y', description: 'Vertical resolution', unit: 'px', type: 'number' }
                ]
            },
            {
                id: 'WIFI',
                name: 'WiFi',
                description: 'WiFi Session',
                dimensions: [
                    { id: 'wifi-session-duration', name: 'Session duration', description: 'Session duration', unit: 'ms', type: 'number' },
                    { id: 'wifi-rssi', name: 'RSSI', description: 'Received Signal Strength Indicator', unit: '', type: 'number' },
                    { id: 'wifi-snr', name: 'SNR', description: 'Signal-to-Noise Ratio', unit: '', type: 'number' }
                ]
            },
            {
                id: 'SPEED',
                name: 'Speed',
                description: '',
                dimensions: [
                    { id:'speed', name: 'Speed', description: '', unit: '', type:'number' }
                ]
            },
            {
                id: 'PRESSURE',
                name: 'Pressure',
                description: 'Atmospheric pressure in hPa (millibar)',
                dimensions: [
                    { id:'pressure', name: 'Pressure', description: '', unit: 'hPa', type:'number' }
                ]
            },
            {
                id: 'PROXIMITY',
                name: 'Proximity',
                description: 'Proximity from object (binary or in cm)',
                dimensions: [
                    { id:'distance-cm', name: 'Distance', description: '', unit: 'cm', type:'number' }
                ]
            },
            {
                id: 'RELATIVE_HUMIDITY',
                name: 'Relative Humidity',
                description: 'Relative ambient air humidity in percent',
                dimensions: [
                    { id:'relative-humidity', name: 'Relative Humidity', description: '', unit: 'H%', type:'number' }
                ]
            },
            {
                id: 'HEART_RATE',
                name: 'Heart Rate',
                description: 'Heart Rate Measurement (HRM)',
                dimensions: [
                    { id: 'heart-rate', name: 'Heart Rate', description: 'Heart rate in beats per minutes', unit: 'BPM', type: 'number' },
                    { id: 'rr-interval', name: 'RR-Interval', description: 'RR-Interval in seconds', unit: 's', type: 'number' }
                ]
            },
            {
                id: 'CLASS',
                name: 'Class',
                description: '',
                dimensions: [
                    { id: 'class', name: 'Class', description: 'Values of this dimension represents the classes of the property.', unit: '', type: 'string' }
                ]
            },
            {
                id: 'MAGNETIC_FIELD',
                name: 'Magnetic Field',
                description: 'Geomagnetic field strength along the x, y and z axis.',
                dimensions: [
                    { id: 'magnetic-x', name: 'x', description: 'Geomagnetic field strength along the x axis.', unit: 'uT', type: 'number' },
                    { id: 'megnetic-y', name: 'y', description: 'Geomagnetic field strength along the y axis.', unit: 'uT', type: 'number' },
                    { id: 'magnetic-z', name: 'z', description: 'Geomagnetic field strength along the z axis.', unit: 'uT', type: 'number' }
                ]
            },
            {
                id: 'GRAVITY',
                name: 'Gravity',
                description: 'Force of gravity along x, y and z axis.',
                dimensions: [
                    { id: 'gravity-x', name: 'x', description: 'Force of gravity along the x axis.', unit: 'm/s2', type: 'number' },
                    { id: 'gravity-y',  name: 'y', description: 'Force of gravity along the y axis.', unit: 'm/s2', type: 'number' },
                    { id: 'gravity-z',  name: 'z', description: 'Force of gravity along the z axis.', unit: 'm/s2', type: 'number' }
                ]
            },
            {
                id: 'ROTATION_VECTOR',
                name: 'Rotation Vector',
                description: '',
                dimensions: [
                    { id: 'rotation-vector-x', name: 'x', description: 'Rotation vector component along the x axis (x * sin(theta/2)).', unit: '', type: 'number' },
                    { id: 'rotation-vector-y', name: 'y', description: 'Rotation vector component along the y axis (y * sin(theta/2)).', unit: '', type: 'number' },
                    { id: 'rotation-vector-z', name: 'z', description: 'Rotation vector component along the z axis (z * sin(theta/2)).', unit: '', type: 'number' }
                ]
            },
            {
                id: 'EULER_ANGLE',
                name: 'Euler Angle',
                description:
                    'The orientation of a rigid body with respect to a fixed coordinate system',
                dimensions: [
                    { id: 'euler-angle-x', name: 'x', description: '', unit: 'degree', type: 'number' },
                    { id: 'euler-angle-y', name: 'y', description: '', unit: 'degree', type: 'number' },
                    { id: 'euler-angle-z', name: 'z', description: '', unit: 'degree', type: 'number' }
                ]
            },
            
            {
                id: 'ALTITUDE',
                name: 'Altitude',
                description: 'Altitude in meters above the WGS 84 reference ellipsoid.',
                dimensions: [
                    { id:'distance-m', name: 'Distance', description: '', unit: 'm', type:'number' }
                ]
            },
            {
                id: 'BEARING',
                name: 'Bearing',
                description: 'Bearing in degrees',
                dimensions: [
                    { id:'bearing', name: 'Bearing', description: '', unit: '°', type:'number' }
                ]
            },
            {
                id: 'COUNT',
                name: 'Count',
                description: '',
                dimensions: [
                    { id:'count', name: 'Count', description: '', unit: '', type:'number' }
                ]
            },
            {
                id: 'FORCE',
                name: 'Force',
                description: '',
                dimensions: [
                    { id:'force', name: 'Force', description: '', unit: 'kg', type:'number' }
                ]
            },
            {
                id: 'TEMPERATURE',
                name: 'Temperature',
                description: '',
                dimensions: [
                    { id:'temperature', name: 'Temperature', description: '', unit: '°C', type:'number' }
                ]
            },
            {
                id: 'CPU',
                name: 'CPU',
                description: '',
                dimensions: [
                    { id:'cpu', name: 'CPU', description: 'CPU Usage', unit: '%', type:'number' }
                ]
            },
            {
                id: 'STATE',
                name: 'State',
                description: '',
                dimensions: [
                    { id:'state', name: 'Value', description: '', unit: '', type:'number' }
                ]
            },
            {
                id: 'IP_ADDRESS',
                name: 'IP Address',
                description: 'Local and external IP address',
                dimensions: [
                    { id: 'local-ip-address', name: 'Local IP', description: 'Local IP', unit: '', type: 'string' },
                    { id: 'local-ip-address-type', name: 'Type Local IP', description: 'Type Local IP', unit: '', type: 'number' },
                    { id: 'external-ip-address', name: 'External IP', description: 'External IP', unit: '', type: 'string' },
                    { id: 'external-ip-address-type', name: 'Type External IP', description: 'Type External IP', unit: '', type: 'number' }
                ]
            }
        ]

        const propertyTypeRepository = getRepository(PropertyType);
        propertyTypes.forEach(property => {
            propertyTypeRepository.save(property).catch( (error) => {
                Log.error(JSON.stringify(error))
            });
        });
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
    }

}


