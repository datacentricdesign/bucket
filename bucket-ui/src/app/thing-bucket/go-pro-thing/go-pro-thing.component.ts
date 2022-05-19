import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { ThingService, Download } from '../services/thing.service';
import { Observable } from 'rxjs';

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

  constructor(
    private thingService: ThingService) {
  }

  async ngOnInit(): Promise<void> {
  }

  // render the image in our view
  async processVideo(files: FileList) {
    let videoProperty;
    if (files[0].name.endsWith('.360')) {
      videoProperty = await this.thingService.findOrCreatePropertyByName(this.thingId, '360 Video', 'VIDEO_360');
    } else {
      videoProperty = await this.thingService.findOrCreatePropertyByName(this.thingId, 'MP4 Video', 'VIDEO');
    }
    var video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        videoProperty.values = [[Date.now(), video.duration * 1000]];
        const uploadObs = this.thingService.updatePropertyValues(this.thingId, videoProperty, files[0]);
        uploadObs.subscribe(event => {
          if (event.type === HttpEventType.UploadProgress) {
            document.getElementById('upload-telemetry-progress').style.width = (event.loaded * 100.0 / event.total) + '%'
          } else if (event instanceof HttpResponse) {
            console.log('File is completely uploaded!');
          }
        })
    }
    video.src = URL.createObjectURL(files[0]);
  }
  
}