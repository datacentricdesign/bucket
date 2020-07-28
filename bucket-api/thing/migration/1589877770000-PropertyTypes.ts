import { MigrationInterface, QueryRunner, getRepository } from "typeorm";
import { Thing } from "../Thing";
import { v4 as uuidv4 } from 'uuid';
import { PropertyType } from "../property/propertyType/PropertyType";
import { Dimension } from "../property/dimension/Dimension";
import { Property } from "@datacentricdesign/types";

export class PropertyTypes1589877771000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {

        const xyzAcc: Dimension[] = [
            {
                id: 'acceleration-x',
                name: 'x',
                description: 'Acceleration force that is applied to a device on physical axe x, including the force of gravity.',
                unit: 'm/s2',
                type: 'number'
            },
            {
                id: 'acceleration-y',
                name: 'y',
                description:
                    'Acceleration force that is applied to a device on physical axe y, including the force of gravity.',
                unit: 'm/s2',
                type: 'number'
            },
            {
                id: 'acceleration-z',
                name: 'z',
                description:
                    'Acceleration force that is applied to a device on physical axe z, including the force of gravity.',
                unit: 'm/s2',
                type: 'number'
            }
        ]
        
        // const dimensionRepository = getRepository(Dimension);
        // xyzAcc.forEach(dimension => {
        //     dimensionRepository.save(dimension);
        // });
        
        const propertyTypes: PropertyType[] = [
            {
                id: 'ACCELEROMETER',
                name: 'Accelerometer',
                description:
                    'Acceleration force that is applied to a device on all three physical axes x, y and z, including the force of gravity.',
                dimensions: xyzAcc
            },
        ]

        const propertyTypeRepository = getRepository(PropertyType);
        propertyTypes.forEach(property => {
            propertyTypeRepository.save(property);
        });



        // const text: Dimension = {
        //     name: 'Text',
        //     description: '',
        //     unit: ''
        // }

        // const xyzRotAcc: Dimension[] = [
        //     {
        //         name: 'x',
        //         description: 'Rate of rotation around the x axis.',
        //         unit: 'rad/s'
        //     },
        //     {
        //         name: 'y',
        //         description: 'Rate of rotation around the y axis.',
        //         unit: 'rad/s'
        //     },
        //     {
        //         name: 'z',
        //         description: 'Rate of rotation around the z axis.',
        //         unit: 'rad/s'
        //     }
        // ]

        // const xyz: Dimension[] = [
        //     {
        //         name: 'x',
        //         description:
        //             'Rotation vector component along the x axis (x * sin(theta/2)).',
        //         unit: ''
        //     },
        //     {
        //         name: 'y',
        //         description:
        //             'Rotation vector component along the y axis (y * sin(theta/2)).',
        //         unit: ''
        //     },
        //     {
        //         name: 'z',
        //         description:
        //             'Rotation vector component along the z axis (z * sin(theta/2)).',
        //         unit: ''
        //     }
        // ]

        // const propertyTypes: PropertyType[] = [
        //     {
        //     id: 'TEXT',
        //     name: 'Text',
        //     description: '',
        //     dimensions: [text]
        // },
        // {
        //     id: 'GYROSCOPE',
        //     name: 'Gyroscope',
        //     description: 'Rate of rotation around the three axis x, y and z.',
        //     dimensions: xyzRotAcc
        // },
        // {
        //     id: 'BINARY',
        //     name: 'Binary',
        //     description: 'Can take value 0 or 1.',
        //     dimensions: [{ name: 'state', description: 'Binary State', unit: '' }]
        // },
        // {
        //     id: 'MAGNETIC_FIELD',
        //     name: 'Magnetic Field',
        //     description: 'Geomagnetic field strength along the x, y and z axis.',
        //     dimensions: [
        //         {
        //             name: 'x',
        //             description: 'Geomagnetic field strength along the x axis.',
        //             unit: 'uT'
        //         },
        //         {
        //             name: 'y',
        //             description: 'Geomagnetic field strength along the y axis.',
        //             unit: 'uT'
        //         },
        //         {
        //             name: 'z',
        //             description: 'Geomagnetic field strength along the z axis.',
        //             unit: 'uT'
        //         }
        //     ]
        // },
        // {
        //     id: 'GRAVITY',
        //     name: 'Gravity',
        //     description: 'Force of gravity along x, y and z axis.',
        //     dimensions: xyzAcc
        // },
        // {
        //     id: 'ROTATION_VECTOR',
        //     name: 'Rotation Vector',
        //     description: '',
        //     dimensions: xyz
        // },
        // {
        //     id: 'EULER_ANGLE',
        //     name: 'Euler Angle',
        //     description:
        //         'The orientation of a rigid body with respect to a fixed coordinate system',
        //     dimensions: [
        //         {
        //             name: 'x',
        //             description: '',
        //             unit: 'degree'
        //         },
        //         {
        //             name: 'y',
        //             description: '',
        //             unit: 'degree'
        //         },
        //         {
        //             name: 'z',
        //             description: '',
        //             unit: 'degree'
        //         }
        //     ]
        // },
        // {
        //     id: 'LIGHT',
        //     name: 'Light',
        //     description: 'Light level',
        //     dimensions: [
        //         {
        //             name: 'Illuminance',
        //             description: '',
        //             unit: 'lx'
        //         }
        //     ]
        // },
        // {
        //     id: 'LOCATION',
        //     name: 'Location',
        //     description: 'Longitude and latitude in degrees',
        //     dimensions: [
        //         {
        //             name: 'Longitude',
        //             description: '',
        //             unit: '°'
        //         },
        //         {
        //             name: 'Latitude',
        //             description: '',
        //             unit: '°'
        //         }
        //     ]
        // },
        // {
        //     id: 'ALTITUDE',
        //     name: 'Altitude',
        //     description: 'Altitude in meters above the WGS 84 reference ellipsoid.',
        //     dimensions: [
        //         {
        //             name: 'Altitude',
        //             description: '',
        //             unit: 'm'
        //         }
        //     ]
        // },
        // {
        //     id: 'BEARING',
        //     name: 'Bearing',
        //     description: 'Bearing in degrees',
        //     dimensions: [
        //         {
        //             name: 'Bearing',
        //             description: '',
        //             unit: '°'
        //         }
        //     ]
        // },
        // {
        //     id: 'SPEED',
        //     name: 'Speed',
        //     description: '',
        //     dimensions: [
        //         {
        //             name: 'Speed',
        //             description: '',
        //             unit: ''
        //         }
        //     ]
        // },
        // {
        //     id: 'PRESSURE',
        //     name: 'Pressure',
        //     description: 'Atmospheric pressure in hPa (millibar)',
        //     dimensions: [
        //         {
        //             name: 'Pressure',
        //             description: '',
        //             unit: 'hPa'
        //         }
        //     ]
        // },
        // {
        //     id: 'PROXIMITY',
        //     name: 'Proximity',
        //     description: 'Proximity from object (binary or in cm)',
        //     dimensions: [
        //         {
        //             name: 'Proximity',
        //             description: '',
        //             unit: 'cm'
        //         }
        //     ]
        // },
        // {
        //     id: 'RELATIVE_HUMIDITY',
        //     name: 'Relative Humidity',
        //     description: 'Relative ambient air humidity in percent',
        //     dimensions: [
        //         {
        //             name: 'Relative Humidity',
        //             description: '',
        //             unit: 'H%'
        //         }
        //     ]
        // },
        // {
        //     id: 'COUNT',
        //     name: 'Count',
        //     description: '',
        //     dimensions: [
        //         {
        //             name: 'Count',
        //             description: '',
        //             unit: ''
        //         }
        //     ]
        // },
        // {
        //     id: 'FORCE',
        //     name: 'Force',
        //     description: '',
        //     dimensions: [
        //         {
        //             name: 'Force',
        //             description: '',
        //             unit: 'kg'
        //         }
        //     ]
        // },
        // {
        //     id: 'TEMPERATURE',
        //     name: 'Temperature',
        //     description: '',
        //     dimensions: [
        //         {
        //             name: 'Temperature',
        //             description: '',
        //             unit: '°C'
        //         }
        //     ]
        // },
        // {
        //     id: 'STATE',
        //     name: 'State',
        //     description: '',
        //     dimensions: [
        //         {
        //             name: 'Value',
        //             description: '',
        //             unit: ''
        //         }
        //     ]
        // },
        // {
        //     id: 'CLASS',
        //     name: 'Class',
        //     description: '',
        //     dimensions: [
        //         {
        //             name: 'Class',
        //             description:
        //                 'Values of this dimension represents the classes of the property',
        //             unit: ''
        //         }
        //     ]
        // },
        // {
        //     id: 'VIDEO',
        //     name: 'Video',
        //     description: '',
        //     dimensions: [
        //         {
        //             name: 'Duration',
        //             description: 'Duration of the video record.',
        //             unit: 'ms'
        //         }
        //     ]
        // },
        // {
        //     id: 'AUDIO',
        //     name: 'Audio',
        //     description: '',
        //     dimensions: [
        //         {
        //             name: 'Duration',
        //             description: 'Duration of the audio record.',
        //             unit: 'ms'
        //         }
        //     ]
        // },
        // {
        //     id: 'PICTURE',
        //     name: 'Picture',
        //     description: '',
        //     dimensions: [
        //         {
        //             name: 'x',
        //             description: 'Horizontal resolution',
        //             unit: 'px'
        //         },
        //         {
        //             name: 'y',
        //             description: 'Vertical resolution',
        //             unit: 'px'
        //         }
        //     ]
        // },
        // {
        //     id: 'HEART_RATE',
        //     name: 'Heart Rate',
        //     description: 'Heart Rate Measurement (HRM)',
        //     dimensions: [
        //         {
        //             name: 'Heart Rate',
        //             description: 'Heart rate in beats per minutes',
        //             unit: 'BPM'
        //         },
        //         {
        //             name: 'RR-Interval',
        //             description: 'RR-Interval in seconds',
        //             unit: 's'
        //         }
        //     ]
        // },
        // {
        //     id: 'WIFI',
        //     name: 'WiFi',
        //     description: 'WiFi interaction',
        //     dimensions: [
        //         {
        //             name: 'Session duration',
        //             description: 'Session duration',
        //             unit: 'ms'
        //         },
        //         {
        //             name: 'RSSI',
        //             description: 'Received Signal Strength Indicator',
        //             unit: ''
        //         },
        //         {
        //             name: 'SNR',
        //             description: 'Signal-to-Noise Ratio',
        //             unit: ''
        //         }
        //     ]
        // },
        // {
        //     id: 'ONE_DIMENSION',
        //     name: '1 Dimension',
        //     description: '',
        //     dimensions: [
        //         {
        //             name: 'Value',
        //             description: '',
        //             unit: ''
        //         }
        //     ]
        // },
        // {
        //     id: 'TWO_DIMENSIONS',
        //     name: '2 Dimensions',
        //     description: '',
        //     dimensions: [
        //         {
        //             name: 'Value1',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value2',
        //             description: '',
        //             unit: ''
        //         }
        //     ]
        // },
        // {
        //     id: 'THREE_DIMENSIONS',
        //     name: '3 Dimensions',
        //     description: '',
        //     dimensions: [
        //         {
        //             name: 'Value1',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value2',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value3',
        //             description: '',
        //             unit: ''
        //         }
        //     ]
        // },
        // {
        //     id: 'FOUR_DIMENSIONS',
        //     name: '4 Dimensions',
        //     description: '',
        //     dimensions: [
        //         {
        //             name: 'Value1',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value2',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value3',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value4',
        //             description: '',
        //             unit: ''
        //         }
        //     ]
        // },
        // {
        //     id: 'FIVE_DIMENSIONS',
        //     name: '5 Dimensions',
        //     description: '',
        //     dimensions: [
        //         {
        //             name: 'Value1',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value2',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value3',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value4',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value5',
        //             description: '',
        //             unit: ''
        //         }
        //     ]
        // },
        // {
        //     id: 'SIX_DIMENSIONS',
        //     name: '6 Dimensions',
        //     description: '',
        //     dimensions: [
        //         {
        //             name: 'Value1',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value2',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value3',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value4',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value5',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value6',
        //             description: '',
        //             unit: ''
        //         }
        //     ]
        // },
        // {
        //     id: 'NINE_DIMENSIONS',
        //     name: '9 Dimensions',
        //     description: '',
        //     dimensions: [
        //         {
        //             name: 'Value1',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value2',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value3',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value4',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value5',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value6',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value7',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value8',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value9',
        //             description: '',
        //             unit: ''
        //         }
        //     ]
        // },
        // {
        //     id: 'TEN_DIMENSIONS',
        //     name: '10 Dimensions',
        //     description: '',
        //     dimensions: [
        //         {
        //             name: 'Value1',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value2',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value3',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value4',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value5',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value6',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value7',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value8',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value9',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value10',
        //             description: '',
        //             unit: ''
        //         }
        //     ]
        // },
        // {
        //     id: 'ELEVEN_DIMENSIONS',
        //     name: '11 Dimensions',
        //     description: '',
        //     dimensions: [
        //         {
        //             name: 'Value1',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value2',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value3',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value4',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value5',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value6',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value7',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value8',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value9',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value10',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value11',
        //             description: '',
        //             unit: ''
        //         }
        //     ]
        // },
        // {
        //     id: 'TWELVE_DIMENSIONS',
        //     name: '12 Dimensions',
        //     description: '',
        //     dimensions: [
        //         {
        //             name: 'Value1',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value2',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value3',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value4',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value5',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value6',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value7',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value8',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value9',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value10',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value11',
        //             description: '',
        //             unit: ''
        //         },
        //         {
        //             name: 'Value12',
        //             description: '',
        //             unit: ''
        //         }
        //     ]
        // }
        // ]

    }

    public async down(queryRunner: QueryRunner): Promise<any> {
    }

}


