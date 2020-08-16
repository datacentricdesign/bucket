import { Component, OnInit } from '@angular/core';
import { DTOProperty, Property, ValueOptions } from '@datacentricdesign/types';
import { Observable, throwError } from 'rxjs';
import { Title } from '@angular/platform-browser';
import { AppService } from 'app/app.service';
import { ThingService } from '../services/thing.service';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { OAuthService } from 'angular-oauth2-oidc';
import { catchError, map } from 'rxjs/operators';
import { ToastrService } from "ngx-toastr";

import * as moment from 'moment';

@Component({
  selector: 'app-property',
  templateUrl: './property.component.html'
})
export class PropertyComponent implements OnInit {

  private apiURL: string

  property$: Observable<Property>;

  thingId: string;
  id: string;
  description: string
  name: string
  property: Property

  downloadModel: any = {
    from: moment().subtract(1, 'days').format('YYYY-MM-DD'),
    to: moment().format('YYYY-MM-DD'),
    timeInterval: undefined,
    fctInterval: undefined,
    fill: 'none'
  }

  uploadModel: any = {
    hasLabel: false,
    fileToUpload: File = null
  }

  updateProperty: DTOProperty = {
    name: '',
    description: ''
  }

  constructor(
    private _Activatedroute: ActivatedRoute,
    private _router: Router,
    private http: HttpClient,
    private oauthService: OAuthService,
    private titleService: Title,
    private appService: AppService,
    private thingService: ThingService,
    private toastr: ToastrService) {
    this.apiURL = appService.settings.apiURL
  }

  ngOnInit(): void {
    this._Activatedroute.paramMap.subscribe(params => {
      this.thingId = params.get('id');
      this.id = params.get('propertyId');
      let headers = new HttpHeaders().set('Accept', 'application/json')
        .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());
      this.property$ = this.http.get<Property>(this.apiURL + "/things/" + this.thingId + '/properties/' + this.id, { headers }).pipe(
        map((data: Property) => {
          this.property = data
          this.titleService.setTitle(this.property.name);
          return data;
        }), catchError(error => {
          return throwError('Property not found!');
        })
      )
    });
  }

  editName() {
    this.thingService.editProperty(this.thingId, this.id, { name: this.updateProperty.name })
  }

  editDescription() {
    this.thingService.editProperty(this.thingId, this.id, { description: this.updateProperty.description })
  }

  delete() {
    this.thingService.deleteProperty(this.thingId, this.id)
  }

  download() {
    console.log(this.downloadModel)
    const options: ValueOptions = {
      from: moment(this.downloadModel.from, "YYYY-MM-DD").unix() * 1000,
      to: moment(this.downloadModel.to, "YYYY-MM-DD").unix() * 1000 + 86400000,
      timeInterval: this.downloadModel.timeInterval,
      fctInterval: this.downloadModel.fctInterval,
      fill: this.downloadModel.fill
    }
    console.log(options)
    console.log(new Date(options.from))
    const csvFormat = true
    this.thingService.getPropertyValues(this.thingId, this.id, options, csvFormat)
  }

  upload() {
    this.thingService.csvFileUpload(this.thingId, this.id, this.uploadModel.fileToUpload, this.uploadModel.hasLabel)
      .subscribe(() => {
        const message = 'Data uploaded to your property.'
        this.toast(message, 'success', 'nc-cloud-upload-94')
      }, error => {
        this.toast(error, 'error', 'nc-cloud-upload-94')
      });
  }

  handleFileInput(files: FileList) {
    this.uploadModel.fileToUpload = files.item(0);
  }

  toast(message:string, type:string, icon:string) {
    this.toastr.info(
      '<span data-notify="icon" class="nc-icon '+icon+'"></span><span data-notify="message">'+message+'</span>',
        "",
        {
          timeOut: 4000,
          closeButton: true,
          enableHtml: true,
          toastClass: "alert alert-"+type+" alert-with-icon",
          positionClass: "toast-top-center"
        }
      );
  }
}
