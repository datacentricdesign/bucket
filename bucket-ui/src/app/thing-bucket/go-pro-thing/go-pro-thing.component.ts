import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { ThingService, Download } from '../services/thing.service';
import { Observable } from 'rxjs';

import * as fs from 'fs';
import * as gpmfExtract from 'gpmf-extract';
import * as goproTelemetry from 'gopro-telemetry';
import * as moment from 'moment';
import { Property } from '@datacentricdesign/types';
import { HttpEventType, HttpResponse } from '@angular/common/http';

@Component({
  selector: 'app-go-pro-thing',
  templateUrl: './go-pro-thing.component.html',
  styleUrls: ['./go-pro-thing.component.css']
})
export class GoProThingComponent implements OnInit {

  @Input() thingId: string;
  @Input() thingName: string;
  @Output() foundEvent = new EventEmitter<boolean>();

  private map = {
    'ACCL': { name: 'Accelerometer', typeId: 'ACCELEROMETER' },
    'GYRO': { name: 'Gyroscope', typeId: 'GYROSCOPE' },
    'SHUT': { name: 'Exposure Time', typeId: 'EXPOSURE_TIME' },//Exposure time (shutter speed) in seconds 1 dim
    'WBAL': { name: 'White Balance temperature', typeId: 'WHITE_BALANCE_TEMPERATURE' }, // White Balance temperature (Kelvin) 1 dim
    'WRGB': { name: 'White Balance RGB gains', typeId: 'WHITE_BALANCE_RGB_GAINS' }, // White Balance RGB gains (3 dim)
    'ISOE': { name: 'Sensor ISO', typeId: 'SENSOR_ISO' }, // 1 dim
    'YAVG': { name: 'Average luminance', typeId: 'AVERAGE_LUMINANCE' }, // 1 dim
    'UNIF': { name: 'Image Uniformity', typeId: 'IMAGE_UNIFORMITY' }, // 1 dim
    'SCEN': { name: 'Scene Classification', typeId: 'SCENE_CLASSIFICATION' }, // 6 dims: snow,urban,indoor,water,vegetation,beach
    'HUES': { name: 'Predominant Hues', typeId: 'PREDOMINANT_HUES' }, // 3 dim
    'GPS5': { name: 'GPS 5', typeId: 'GPS5' }, // 5 dim Lat., Long., Alt., 2D speed, 3D speed deg deg m m/s m/s
    'CORI': { name: 'Camera Orientation', typeId: 'CAMERA_ORIENTATION' }, // 4 dim
    'IORI': { name: 'Image Orientation', typeId: 'IMAGE_ORIENTATION' }, // 4 dim
    'GRAV': { name: 'Gravity Vector', typeId: 'GRAVITY' }, // 3 dim
    'WNDM': { name: 'Wind Processing', typeId: 'WIND_PROCESSING' }, // 1 dim Wind Processing[wind_enable, meter_value(0 - 100)]
    'MWET': { name: 'Microphone Wet', typeId: 'MICROPHONE_WET' }, // 1 dim Microphone Wet[mic_wet, all_mics, confidence]
    'AALP': { name: 'AGC Audio Level', typeId: 'AGC_AUDIO_LEVEL' }, // AGC audio level[rms_level ,peak_level] unit dBFS
    'FACE1': { name: 'Face Coordinates and Details', typeId: 'FACE_COORDINATES_DETAILS' } // Face Coordinates and details (x,y,w,h,smile)
  }

  constructor(
    private thingService: ThingService) {
  }

  async ngOnInit(): Promise<void> {
  }

  // render the image in our view
  async processVideo(files: FileList) {
    const elemProgress: HTMLElement = document.getElementById('upload-telemetry-progress');
    const elemProperty: HTMLElement = document.getElementById('upload-telemetry-property');
    elemProperty.innerHTML = '<p>Extracting GPMF...</p>'
    const progress = percent => {
      elemProgress.style.width = percent + '%'
    }
    gpmfExtract(files[0], true, progress)
      .then(async res => {
        // Do what you want with the data
        const elem: HTMLElement = document.getElementById('telemetry-info');
        elem.innerHTML = '<p>Length of data received: ' + res.rawData.length
          + '<br>Framerate of data received:' + (1 / res.timing.frameDuration) + '</p>';
        const input = { rawData: res.rawData, timing: res.timing };
        const options = { repeatSticky: true };
        const elemProperty: HTMLElement = document.getElementById('upload-telemetry-property');
        const elemProgress: HTMLElement = document.getElementById('upload-telemetry-progress');
        elemProperty.innerHTML = '<p>Extracting telemetry...</p>'
        goproTelemetry(input, options)
          .then(async telemetry => {
            const samples = telemetry["1"]["streams"]["ACCL"]["samples"];
            const videoProperty = await this.thingService.findOrCreatePropertyByName(this.thingId, 'Video', 'VIDEO');
            videoProperty.values = [[samples[0].date.getTime(), Math.floor(samples[samples.length - 1].cts)]];
            elemProperty.innerHTML = '<p>Uploading video...</p>'
            const uploadObs = this.thingService.updatePropertyValues(this.thingId, videoProperty, files[0]);
            uploadObs.subscribe(event => {
              if (event.type === HttpEventType.UploadProgress) {
                elemProgress.style.width = (event.loaded * 100.0 / event.total) + '%'
              } else if (event instanceof HttpResponse) {
                console.log('File is completely uploaded!');
                this.uploadData(telemetry["1"]["streams"]);
              }
            })
          })
          .catch(error => {
            console.log(error)
          });
      })
      .catch(error => {
        console.log(error)
      })
  }

  async uploadData(telemetry) {
    const elem: HTMLElement = document.getElementById('upload-telemetry-property');
    for (const key in telemetry) {
      if (telemetry.hasOwnProperty(key)) {
        if (this.map.hasOwnProperty(key)) {
          elem.innerHTML = 'Uploading property: ' + this.map[key].name + ' (' + this.map[key].typeId + ')...';
          const prop = await this.thingService.findOrCreatePropertyByName(this.thingId, this.map[key].name, this.map[key].typeId);
          this.parse(key, prop, telemetry[key]["samples"]);
        } else {
          console.warn('unknown key: ' + key)
        }
      }
    }
    elem.innerHTML = 'Done.';
    const elemProgress: HTMLElement = document.getElementById('upload-telemetry-progress');
    elemProgress.style.width = '100%'
  }

  parse(key: string, property: Property, telemetrySamples: any) {
    property.values = [];
    const max_chunk = 500;
    const elem: HTMLElement = document.getElementById('upload-telemetry-progress');
    for (let i = 0; i < telemetrySamples.length; i++) {
      const sample = telemetrySamples[i]['value'];
      const ts = moment(telemetrySamples[i]['date'], "YYYY-MM-DDTHH:mm:ss.SSSZ").valueOf();
      if (['ACCL', 'GYRO'].indexOf(key) >= 0) {
        property.values.push([ts, sample[1], sample[2], sample[0]]);
      } else if (['WRGB', 'SCEN', 'HUES', 'GPS5', 'CORI', 'IORI', 'GRAV', 'FACE1'].indexOf(key) >= 0) {
        sample.unshift(ts)
        property.values.push(sample);
      } else {
        property.values.push([ts, sample]);
      }

      if (i % max_chunk == 0) {
        this.thingService.updatePropertyValues(this.thingId, property).toPromise()
        .then(res => {
          console.log("sent up to " + i)
          elem.style.width = (i * 100.0 / telemetrySamples.length) + '%'
        })
        .catch(error => {
          console.error(error)
        })
        property.values = []
      }
    }
    if (property.values.length > 0) {
      this.thingService.updatePropertyValues(this.thingId, property).toPromise().catch(error => {
        console.log(error)
      })
    }
  }
}