import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable, throwError } from 'rxjs';

import { map, catchError } from 'rxjs/operators';
import { Thing, PropertyType, DTOProperty, DTOThing } from '@datacentricdesign/types';
import { AppService } from 'app/app.service';
import { OAuthService } from 'angular-oauth2-oidc';
import { Title } from '@angular/platform-browser';
import { ThingService } from '../services/thing.service';

@Component({
    selector: 'thing-cmp',
    moduleId: module.id,
    templateUrl: 'thing.component.html',
    styleUrls: ['thing.component.css']
})
export class ThingComponent implements OnInit {

    private apiURL: string

    thing$: Observable<Thing>;
    types$: Observable<PropertyType[]>;

    id: string;
    description: string
    name: string
    thing: Thing

    mqttStatus: Array<any>

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
    }

    ngOnInit() {
        this.typeDetails = ''
        this._Activatedroute.paramMap.subscribe(params => {
            this.id = params.get('id');
            let headers = new HttpHeaders().set('Accept', 'application/json')
                .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());
            this.thing$ = this.http.get<Thing>(this.apiURL + "/things/" + this.id, { headers }).pipe(
                map((data: Thing) => {
                    this.thing = data
                    this.checkMQTTStatus()
                    this.titleService.setTitle(this.thing.name);
                    return data;
                }), catchError(error => {
                    return throwError('Thing not found!');
                })
            )
        });
        this._Activatedroute.paramMap.subscribe(params => {
            this.id = params.get('id');
            let headers = new HttpHeaders().set('Accept', 'application/json')
                .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());
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

    async checkMQTTStatus() {
        for (let i=0;i<this.thing.properties.length;i++) {
            if (this.thing.properties[i].type.id === 'MQTT_STATUS') {
                const result = await this.thingService.lastValues(this.thing.id, this.thing.properties[i].id)
                console.log(result)
                this.mqttStatus = result[0]
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
}