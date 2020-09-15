import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable, throwError } from 'rxjs';

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

    constructor(private _Activatedroute: ActivatedRoute,
        private _router: Router,
        private http: HttpClient,
        private oauthService: OAuthService,
        private titleService: Title,
        private appService: AppService,
        private thingService: ThingService) {
        this.apiURL = appService.settings.apiURL
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
    }

    async checkMQTTStatusAndIpAddress() {
        for (let i = 0; i < this.thing.properties.length; i++) {
            if (this.thing.properties[i].type.id === 'MQTT_STATUS') {
                const result = await this.thingService.lastValues(this.thing.id, this.thing.properties[i].id)
                this.mqttStatus = result[0]
            } else if (this.thing.properties[i].type.id === 'IP_ADDRESS') {
                const result = await this.thingService.lastValues(this.thing.id, this.thing.properties[i].id)
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
        // Block the create button and start spinning
        const button = document.getElementById("createRPiButton") as HTMLButtonElement
        button.disabled = true
        const spinner = document.getElementById("spinnerCreateRPi") as HTMLElement
        spinner.style.display = 'inline-block'
        const dpi = this.dpi.raspberryPi

        // Prepare the body with network blocks if full settings
        const body: any = {
            first_user_name: dpi.first_user_name,
            first_user_password: dpi.first_user_password,
            target_hostname: dpi.target_hostname,
            enable_SSH: dpi.enable_SSH
        }

        if (dpi.home_ESSID && dpi.home_password) {
            body.home_ESSID = dpi.home_ESSID;
            body.home_password = dpi.home_password;
        }

        if (dpi.wpa_ESSID && dpi.wpa_password && dpi.wpa_country) {
            body.wpa_ESSID = dpi.wpa_ESSID;
            body.wpa_password = dpi.wpa_password;
            body.wpa_country = dpi.wpa_country;
        }

        // Call the bucket api
        let headers = new HttpHeaders().set('Accept', 'application/json')
            .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());
        this.http.post(this.apiURL + "/things/" + this.id + '/types/dpi', body, { headers }).subscribe((data: any) => {
            // On callback, refresh, there should be a status to fetch from Bucket
            this.dpi.refreshData()
            // Unlock the button / stop spinner (although the button should be hidden if the build started)
            const button = document.getElementById("createRPiButton") as HTMLButtonElement
            button.disabled = true
            const spinner = document.getElementById("spinnerCreateRPi") as HTMLElement
            spinner.style.display = 'inline-block'
        });
    }

    dpiEventHander($event: any) {
        this.dpiFound = $event;
    }

}