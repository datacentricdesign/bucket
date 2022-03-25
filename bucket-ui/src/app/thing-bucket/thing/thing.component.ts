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
import { SpinnerButtonComponent } from 'app/thing-bucket/spinner-button/spinner-button.component';

@Component({
    selector: 'app-thing-cmp',
    moduleId: module.id,
    templateUrl: 'thing.component.html',
    styleUrls: ['thing.component.css']
})
export class ThingComponent implements OnInit {

    @ViewChild(RaspberryPiThingComponent) dpi: RaspberryPiThingComponent;
    @ViewChild('rpiCreateBt') rpiCreateBt: SpinnerButtonComponent;
    @ViewChild('nameEditBt') nameEditBt: SpinnerButtonComponent;
    @ViewChild('descEditBt') descEditBt: SpinnerButtonComponent;
    @ViewChild('updatePEMBt') updatePEMBt: SpinnerButtonComponent;
    dpiFound: boolean

    // Is DPi generator available
    dpiGenerator = false

    private apiURL: string

    thing$: Observable<Thing>;
    types$: Observable<PropertyType[]>;
    propertyAccess$: Observable<any>;

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

    grafanaId = 0
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

        this._Activatedroute.queryParams
            .subscribe(params => {
                if (params.success !== undefined) {
                    this.thingService.toast(params.success, 'success')
                } else if (params.error !== undefined) {
                    this.thingService.toast(params.error, 'danger')
                }
            });

        this._Activatedroute.paramMap.subscribe(params => {
            this.mqttStatus = []
            this.ipAddress = []
            this.dns = []
            this.id = params.get('id');
            const headers = new HttpHeaders().set('Accept', 'application/json')
                .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());
            this.thing$ = this.http.get<Thing>(this.apiURL + '/things/' + this.id, { headers }).pipe(
                map((data: Thing) => {
                    this.thing = data
                    this.checkNetwork()
                    this.titleService.setTitle(this.thing.name);
                    return data;
                }), catchError(error => {
                    return throwError('Thing not found!');
                })
            )
            this.types$ = this.http.get<PropertyType[]>(this.apiURL + '/types', { headers }).pipe(
                map((data: PropertyType[]) => {
                    this.types = data.sort((first, second) => 0 - (first.name > second.name ? -1 : 1));
                    return this.types;
                }), catchError(error => {
                    return throwError('Types not found!');
                })
            )


            this.propertyAccess$ = this.http.get<any>(this.apiURL + '/things/' + this.id + '/properties?sharedWith=*', { headers }).pipe(
                map((data: any) => {
                    if (data !== undefined) {
                        return data;
                    }
                    return []
                }), catchError(error => {
                    return throwError('Consents not found!');
                })
            )
        });

        this.thingService.getGrafanaId(this.id)
            .then((result: any) => {
                if (result.grafanaId !== undefined) {
                    this.grafanaId = result.grafanaId
                }
            })
            .catch((error) => {
                if (error.error && error.error._hint === 'Service unavailable.') {
                    console.warn('Grafana is not available')
                    this.grafanaId = -1
                }
            })

    }

    async checkNetwork() {
        for (let i = 0; i < this.thing.properties.length; i++) {
            if (this.thing.properties[i].type.id === 'MQTT_STATUS') {
                const result = await this.thingService.lastValues(this.thing.id, this.thing.properties[i].id)
                if (result[0] !== undefined) {
                    this.mqttStatus = result[0]
                }
            } else if (this.thing.properties[i].type.id === 'IP_ADDRESS') {
                const result = await this.thingService.lastValues(this.thing.id, this.thing.properties[i].id)
                if (result[0] !== undefined) {
                    this.ipAddress = result[0]
                }
            } else if (this.thing.properties[i].type.id === 'DNS') {
                const result = await this.thingService.lastValues(this.thing.id, this.thing.properties[i].id)
                if (result[0] !== undefined) {
                    this.dns = result[0]
                }
            }
        }
    }

    onSubmit() {
        this.thingService.createProperty(this.id, this.model)
            .then((data) => {
                window.location.reload();
            })
            .catch((error) => {
                this.thingService.toast(error)
            })
    }

    editName() {
        this.thingService.edit(this.id, { name: this.updateThing.name })
            .then(() => {
                // TODO replace the reload with inside changes, missing the sidebar update
                // this.thingService.toast('Name updated.', 'success')
                // this.thing.name = this.updateThing.name
                // this.updateThing.name = ''
                window.location.href = './things/' + this.id + '?success=Updated+Name.';
            })
            .catch(error => {
                this.thingService.toast(error)
            })
            .finally(() => this.nameEditBt.release())

    }

    editDescription() {
        this.thingService.edit(this.id, { description: this.updateThing.description })
            .then(() => {
                this.thingService.toast('Description updated.', 'success')
                this.thing.description = this.updateThing.description
                this.updateThing.description = ''
            })
            .catch(error => {
                this.thingService.toast(error)
            })
            .finally(() => this.descEditBt.release())
    }

    updatePEM() {
        this.thingService.updatePEM(this.id, this.updateThing.pem)
            .then(() => {
                this.thingService.toast('PEM updated.', 'success')
                this.updateThing.pem = ''
            })
            .catch((error) => {
                this.thingService.toast(error)
            })
            .finally(() => this.updatePEMBt.release())
    }

    delete() {
        this.thingService.delete(this.id)
            .then(() => {
                window.location.href = './things/dashboard?success=Deleted+Thing.';
            })
            .catch((error) => {
                this.thingService.toast(error)
            })
    }

    copyId() {
        const range = document.createRange();
        range.selectNode(document.getElementById('id-thing-to-copy'));
        window.getSelection().removeAllRanges(); // clear current selection
        window.getSelection().addRange(range); // to select text
        document.execCommand('copy');
        window.getSelection().removeAllRanges(); // to deselect
        document.execCommand('copy')
        this.thingService.toast('Thing ID copied to clipboad.', 'success', 'nc-single-copy-04')
    }

    selectType(typeId: string) {
        let type: PropertyType
        for (let i = 0; i < this.types.length; i++) {
            if (this.types[i].id === typeId) {
                type = this.types[i]
                break;
            }
        }
        this.model.typeId = type.id
        this.model.name = type.name
        this.model.description = type.description
        let details = `<h6 class="title">${type.name}</h6>`
        details += `<p class="category">${type.id}</p>`
        details += `<p><b>Description<b>: ${type.description}</p>`
        
         '<p>Dimensions</p><ul>'

         details += `<table class="table">
            <thead class=" text-primary">
                <th> Dimension</th>
                <th> Unit </th>
                <th> Type </th>
                <th> Description </th>
                <th> Labels </th>
            </thead>`
            
        
        for (const dim of Object.keys(type.dimensions)) {
            details += `<tbody>
                            <tr>
                                <td>${type.dimensions[dim].name}<p class="category">${type.dimensions[dim].id}</p></td>
                                <td>${type.dimensions[dim].unit}</td>
                                <td>${type.dimensions[dim].type}</td>
                                <td>${type.dimensions[dim].description}</td>
                                <td>${type.dimensions[dim].labels.join(',')}</td>
                            </tr>
                        </tbody>`
        }
        details += `</table>`
        document.getElementById('typeDetails').innerHTML = details
    }

    onRaspberryPiSubmit() {
        // Call the bucket api
        this.thingService.dpiCreate(this.id, this.dpi.getValues())
            .then(() => {
                // On callback, refresh, there should be a status to fetch from Bucket
                this.dpi.refreshData()
                // Unlock the button / stop spinner (although the button should be hidden if the build started)
                this.rpiCreateBt.release()
            })
            .catch((error) => {
                this.thingService.toast(error)
            })
    }

    dpiEventHander($event: any) {
        this.dpiFound = $event;
    }

    async visualiseWithGrafana(thingId: string) {
        await this.thingService.createGrafanaThing(thingId)
            .then((result) => {
                // Create a link and click on it (opening a new tab to Grafana)
                const a = document.createElement('a')
                a.href = this.grafanaURL + '/d/' + thingId.replace('dcd:things:', '')
                a.target = '_blank';
                a.click();
            })
            .catch((error) => {
                this.thingService.toast(error)
            })
    }

}
