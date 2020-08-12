import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AppService } from 'app/app.service';
import { OAuthService } from 'angular-oauth2-oidc';
import { ThingService } from 'app/thing-bucket/services/thing.service';
import { Thing } from '@datacentricdesign/types';
import { ActivatedRoute } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import * as moment from 'moment';

@Component({
  selector: 'app-thing-connected',
  templateUrl: './thing-connected.component.html',
  styleUrls: ['./thing-connected.component.css']
})
export class ThingConnectedComponent implements OnInit {

  apiURL: string

  things: any;

  constructor(private _Activatedroute: ActivatedRoute, private http: HttpClient, private appService: AppService, private oauthService: OAuthService, private thingService: ThingService) {
    this.apiURL = appService.settings.apiURL;
  }

  ngOnInit(): void {
    let headers = new HttpHeaders().set('Accept', 'application/json')
      .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());

    this.http.get<Thing[]>(this.apiURL + "/things", { headers }).subscribe((data: Thing[]) => {
      if (this.things.length > 0) {
        this.checkMQTTStatus(data).then((connectedThings) => {
          this.things = connectedThings
        })
      } else {
        // if there is no things yet, we skip the statistics all together
        document.getElementById('connected-things-panel').style.display = 'none';
      }

    });
  }

  async checkMQTTStatus(allThings: any): Promise<any> {
    const connectedThings: any = []
    console.log('check mqtt status')
    for (let i = 0; i < allThings.length; i++) {
      const thing = allThings[i]
      for (let j = 0; j < thing.properties.length; j++) {
        const property = thing.properties[j]
        if (property.type.id === 'MQTT_STATUS') {
          console.log('check mqtt status: type MQTT')
          const result = await this.thingService.lastValues(thing.id, property.id)
          console.log(result)
          if (result[0][1] === 'Connected') {
            console.log('1 connected thing!')
            thing.updatedAt = moment(new Date(result[0][0])).fromNow()
            connectedThings.push(thing)
          }
        }
      }
    }
    return Promise.resolve(connectedThings)
  }

}
