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

    // Is DPi generator available
    dpiGenerator = false

    private apiURL: string

    thing$: Observable<Thing>;
    types$: Observable<PropertyType[]>;

    id: string;
    description: string
    name: string
    thing: Thing

    mqttStatus: any[]
    ipAddress: any[]
    dns: any[]

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

    grafanaId: number = -1
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
        this.dns = []
    }

    ngOnInit() {
        this.typeDetails = ''
        this.dpiFound = false
        this._Activatedroute.paramMap.subscribe(params => {
            this.mqttStatus = []
            this.ipAddress = []
            this.dns = []
            this.id = params.get('id');
            let headers = new HttpHeaders().set('Accept', 'application/json')
                .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());
            this.thing$ = this.http.get<Thing>(this.apiURL + "/things/" + this.id, { headers }).pipe(
                map((data: Thing) => {
                    this.thing = data
                    this.checkNetwork()
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
            if (result.grafanaId !== undefined) {
                this.grafanaId = result.grafanaId
            }
        }).catch( (error) => {
            if (error.error && error.error._hint === "Service unavailable.") {
                console.warn('Grafana is not available')
                this.grafanaId = -1
            }
        })

    }

    async checkNetwork() {
        console.log("check network")
        for (let i = 0; i < this.thing.properties.length; i++) {
            if (this.thing.properties[i].type.id === 'MQTT_STATUS') {
                const result = await this.thingService.lastValues(this.thing.id, this.thing.properties[i].id)
                console.log(result)
                this.mqttStatus = result[0]
            } else if (this.thing.properties[i].type.id === 'IP_ADDRESS') {
                const result = await this.thingService.lastValues(this.thing.id, this.thing.properties[i].id)
                console.log(result)
                this.ipAddress = result[0]
            } else if (this.thing.properties[i].type.id === 'DNS') {
                const result = await this.thingService.lastValues(this.thing.id, this.thing.properties[i].id)
                console.log(result)
                this.dns = result[0]
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
        const body = this.dpi.getValues()

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

    async visualiseWithGrafana(thingId: string) {
        await this.thingService.createGrafanaThing(thingId).then( (result) => {
            window.location.href = this.grafanaURL + '/d/' + thingId.replace('dcd:things:','');
        })
    }

}