import { Component, OnInit, ViewChild } from '@angular/core';
import { ThingService } from 'app/thing-bucket/services/thing.service';
import { Thing } from '@datacentricdesign/types';

import * as moment from 'moment';

@Component({
  selector: 'app-thing-connected',
  templateUrl: './thing-connected.component.html',
  styleUrls: ['./thing-connected.component.css']
})
export class ThingConnectedComponent implements OnInit {

  @ViewChild('connected-things-panel') connectedThingsPanelDiv: HTMLDivElement

  things: any

  constructor(private thingService: ThingService) { }

  ngOnInit(): void { }

  afterViewInit(): void {
    this.thingService.find()
      .then((data: Thing[]) => {
        if (data.length > 0) {
          this.checkMQTTStatus(data)
            .then((connectedThings) => {
              this.things = connectedThings
              if (this.things.length === 0) {
                this.connectedThingsPanelDiv.style.display = 'block';
              }
            })
        }
      })
      .catch(error => {
        this.thingService.toast(error)
      })
  }

  async checkMQTTStatus(allThings: any): Promise<any> {
    const connectedThings: any = []
    for (let i = 0; i < allThings.length; i++) {
      const thing = allThings[i]
      for (let j = 0; j < thing.properties.length; j++) {
        const property = thing.properties[j]
        if (property.type.id === 'MQTT_STATUS') {
          const result = await this.thingService.lastValues(thing.id, property.id)
          if (result[0][1] === 'Connected') {
            thing.updatedAt = moment(new Date(result[0][0])).fromNow()
            connectedThings.push(thing)
          }
        }
      }
    }
    return Promise.resolve(connectedThings)
  }

}
