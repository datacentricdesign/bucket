import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable, throwError, config } from 'rxjs';

import { map, catchError } from 'rxjs/operators';
import { Thing, PropertyType, DTOProperty, DTOThing } from '@datacentricdesign/types';
import { AppService } from 'app/app.service';
import { OAuthService } from 'angular-oauth2-oidc';
import { Title } from '@angular/platform-browser';
import { ThingService } from '../services/thing.service';
import { RaspberryPiThingComponent } from '../raspberry-pi-thing/raspberry-pi-thing.component';

@Component({
    selector: 'thing-cmp',
    moduleId: module.id,
    templateUrl: 'thing.component.html',
    styleUrls: ['thing.component.css']
})
export class ThingComponent implements OnInit {

    @ViewChild(RaspberryPiThingComponent) dpi: RaspberryPiThingComponent;
    dpiFound: boolean

    private apiURL: string

    thing$: Observable<Thing>;
    types$: Observable<PropertyType[]>;

    id: string;
    description: string
    name: string
    thing: Thing

    mqttStatus: Array<any>
    ipAddress: Array<any>

    typeDetails: string

    private types: PropertyType[]

    model: DTOProperty = {
        name: '',
        description: '',
        typeId: ''
    }

    updateThing: DTOThing = {
        name: '',
        description: '',
        pem: ''
    }

    grafanaId: number = 0
    grafanaURL: string

    constructor(private _Activatedroute: ActivatedRoute,
        private _router: Router,
        private http: HttpClient,
        private oauthService: OAuthService,
        private titleService: Title,
        private appService: AppService,
        private thingService: ThingService) {
        this.apiURL = appService.settings.apiURL
        this.grafanaURL = appService.settings.grafanaURL
        this.mqttStatus = []
        this.ipAddress = []
    }

    ngOnInit() {
        this.typeDetails = ''
        this.dpiFound = false
        this._Activatedroute.paramMap.subscribe(params => {
            this.id = params.get('id');
            let headers = new HttpHeaders().set('Accept', 'application/json')
                .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());
            this.thing$ = this.http.get<Thing>(this.apiURL + "/things/" + this.id, { headers }).pipe(
                map((data: Thing) => {
                    this.thing = data
                    this.checkMQTTStatusAndIpAddress()
                    this.titleService.setTitle(this.thing.name);
                    return data;
                }), catchError(error => {
                    return throwError('Thing not found!');
                })
            )
            this.types$ = this.http.get<PropertyType[]>(this.apiURL + "/types", { headers }).pipe(
                map((data: PropertyType[]) => {
                    this.types = data;
                    return data;
                }), catchError(error => {
                    return throwError('Types not found!');
                })
            )
        });

        this.thingService.getGrafanaId(this.id).then( (result:any) => {
            console.log(result)
            this.grafanaId = result.grafanaId
        })
    }

    async checkMQTTStatusAndIpAddress() {
        for (let i = 0; i < this.thing.properties.length; i++) {
            if (this.thing.properties[i].type.id === 'MQTT_STATUS') {
                const result = await this.thingService.lastValues(this.thing.id, this.thing.properties[i].id)
                console.log(result)
                this.mqttStatus = result[0]
            } else if (this.thing.properties[i].type.id === 'IP_ADDRESS') {
                const result = await this.thingService.lastValues(this.thing.id, this.thing.properties[i].id)
                console.log(result)
                this.ipAddress = result[0]
            }
        }
    }

    onSubmit() {
        let headers = new HttpHeaders().set('Accept', 'application/json')
            .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());
        this.http.post(this.apiURL + "/things/" + this.id + '/properties', this.model, { headers }).subscribe((data: any) => {
            window.location.reload(true);
        });
    }

    editName() {
        this.thingService.edit(this.id, { name: this.updateThing.name })
    }

    editDescription() {
        this.thingService.edit(this.id, { description: this.updateThing.description })
    }

    updatePEM() {
        this.thingService.updatePEM(this.id, this.updateThing.pem)
    }

    delete() {
        this.thingService.delete(this.id)
    }

    selectType(type: PropertyType) {
        this.model.typeId = type.id
        this.model.name = type.name
        this.model.description = type.description
        let details = type.description + '<ul>'
        for (let dim in type.dimensions) {
            details += '<li>' + type.dimensions[dim].name
            if (type.dimensions[dim].unit !== '') details += ' (' + type.dimensions[dim].unit + ')'
            if (type.dimensions[dim].description !== '') details += ': ' + type.dimensions[dim].description
            details += '</li>'
        }
        details += '</ul>'
        document.getElementById('typeDetails').innerHTML = details
    }

    onRaspberryPiSubmit() {
        const body: any = {
            first_user_name: this.dpi.raspberryPi.first_user_name,
            first_user_password: this.dpi.raspberryPi.first_user_password,
            target_hostname: this.dpi.raspberryPi.target_hostname,
            enable_SSH: this.dpi.raspberryPi.enable_SSH
        }

        if (this.dpi.raspberryPi.home_ESSID !== '' && this.dpi.raspberryPi.home_password !== '') {
            body.dpi.home_ESSID = this.dpi.raspberryPi.home_ESSID;
            body.dpi.home_password = this.dpi.raspberryPi.home_password;
        }

        if (this.dpi.raspberryPi.wpa_ESSID !== '' && this.dpi.raspberryPi.wpa_password !== '' && this.dpi.raspberryPi.wpa_country !== '') {
            body.dpi.wpa_ESSID = this.dpi.raspberryPi.wpa_ESSID;
            body.dpi.wpa_password = this.dpi.raspberryPi.wpa_password;
            body.dpi.wpa_country = this.dpi.raspberryPi.wpa_country;
        }

        console.log(body)

        let headers = new HttpHeaders().set('Accept', 'application/json')
            .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());
        this.http.post(this.apiURL + "/things/" + this.id + '/types/dpi', body, { headers }).subscribe((data: any) => {
            this.dpi.refreshData()
        });
    }

    dpiEventHander($event: any) {
        console.log('found changed ')
        this.dpiFound = $event;
        console.log(this.dpiFound)
    }

    async visualiseWithGrafana(thingId: string) {
        await this.thingService.createGrafanaThing(thingId).then( (result) => {
            window.location.href = this.grafanaURL + '/d/' + thingId.replace('dcd:things:','');
        })
    }

}