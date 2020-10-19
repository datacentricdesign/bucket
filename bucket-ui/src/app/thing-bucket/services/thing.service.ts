import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpEvent, HttpResponse, HttpEventType, HttpProgressEvent } from '@angular/common/http';
import { BASE_URL } from '../../app.tokens';
import { Observable } from 'rxjs';
import { Thing, PropertyType, DTOThing, DTOProperty, ValueOptions, Property } from '@datacentricdesign/types';
import { OAuthService } from 'angular-oauth2-oidc';
import { AppService } from 'app/app.service';
import { catchError, map, scan } from 'rxjs/operators';
import { saveAs } from 'file-saver';
import { Saver, SAVER } from './saver.provider';
import { element } from 'protractor';
import { ToastrService } from 'ngx-toastr';

export interface Download {
  state: 'PENDING' | 'IN_PROGRESS' | 'DONE'
  progress: number
  content: Blob | null
}


@Injectable()
export class ThingService {

  private apiURL: string
  public propertyTypes: PropertyType[]

  constructor(
    private oauthService: OAuthService,
    private http: HttpClient,
    private appService: AppService,
    private toastr: ToastrService,
    @Inject(SAVER) private save: Saver
  ) {
    this.apiURL = this.appService.settings.apiURL;
  }

  public things: Array<Thing> = [];

  find(): Promise<Thing[]> {
    const url = this.apiURL + '/things';
    const headers = this.getHeader()
    return this.http.get<Thing[]>(url, { headers }).toPromise()
  }

  getPropertyValues(thingId: string, propertyId: string, options: ValueOptions, csvFormat: boolean): Promise<Blob> {
    const url = this.apiURL + '/things/' + thingId + '/properties/' + propertyId;
    const params = new HttpParams()
      .set('from', options.from + '')
      .set('to', options.to + '')
    if (options.fctInterval !== undefined) {
      params.set('fctInterval', options.fctInterval + '')
    }
    if (options.timeInterval !== undefined) {
      params.set('timeInterval', options.timeInterval)
    }
    if (options.fill !== undefined) {
      params.set('fill', options.fill)
    }
    const headers = this.getHeader()
    headers.set('Accept', csvFormat ? 'text/csv' : 'application/json')
    return this.http.get(url, { headers, params, responseType: 'blob' as 'blob' }).toPromise()
  }

  createThing(thing: DTOThing): Promise<Thing> {
    const url = this.apiURL + '/things'
    const headers = this.getHeader()
    return this.http.post<Thing>(url, thing, { headers }).toPromise()
  }

  edit(thingId: string, fields: DTOThing) {
    const url = this.apiURL + '/things/' + thingId;
    const headers = this.getHeader()

    const body: DTOThing = {}
    if (fields.name !== undefined && fields.name !== '') {
      body.name = fields.name;
    }
    if (fields.description !== undefined && fields.description !== '') {
      body.description = fields.description;
    }
    return this.http.patch(url, body, { headers }).toPromise()
  }

  updatePEM(thingId: string, pem: string) {
    const url = this.apiURL + '/things/' + thingId + '/pem';
    const headers = this.getHeader()
    return this.http.patch(url, { pem: pem }, { headers }).toPromise()
  }

  delete(thingId: string) {
    const url = this.apiURL + '/things/' + thingId;
    const headers = this.getHeader()
    return this.http.delete(url, { headers }).toPromise()
  }

  grant(thingId: string, propertyId: string, subjects: string[], actions: string[]) {
    const url = this.apiURL + '/things/' + thingId + '/properties/' + propertyId + '/consents';
    const headers = this.getHeader()
    return this.http.post(url, { subjects: subjects, actions: actions }, { headers }).toPromise()
  }

  revoke(thingId: string, propertyId: string, consentId: string) {
    const url = this.apiURL + '/things/' + thingId + '/properties/' + propertyId + '/consents/' + consentId;
    const headers = this.getHeader()
    return this.http.delete(url, { headers }).toPromise()
  }

  createProperty(thingId: string, property: DTOProperty) {
    const headers = this.getHeader()
    return this.http.post(this.apiURL + '/things/' + thingId + '/properties', property, { headers }).toPromise()
  }

  editProperty(thingId: string, propertyId: string, fields: DTOProperty): Promise<any> {
    const url = this.apiURL + '/things/' + thingId + '/properties/' + propertyId;
    const headers = this.getHeader()

    const body: DTOProperty = {}
    if (fields.name !== undefined && fields.name !== '') {
      body.name = fields.name;
    }
    if (fields.description !== undefined && fields.description !== '') {
      body.description = fields.description;
    }
    return this.http.patch(url, body, { headers }).toPromise()
  }

  deleteProperty(thingId: string, propertyId: string): Promise<any> {
    const url = this.apiURL + '/things/' + thingId + '/properties/' + propertyId;
    const headers = this.getHeader()
    return this.http.delete(url, { headers }).toPromise()
  }

  lastValues(thingId: string, propertyId: string): Promise<any> {
    const url = this.apiURL + '/things/' + thingId + '/properties/' + propertyId + '/last';
    const headers = this.getHeader()

    return this.http.get(url, { headers }).toPromise()
  }

  dpCount(timeExpressionFrom, timeInterval?): Promise<any> {
    let url = this.apiURL + '/things/count?from=' + timeExpressionFrom
    if (timeInterval !== undefined) {
      url += '&timeInterval=' + timeInterval;
    }
    const headers = this.getHeader()

    return this.http.get(url, { headers }).toPromise()
  }

  async sharedProperties(sharedWith: string = '*', timeExpressionFrom: string, timeInterval?: string): Promise<any> {
    let url = this.apiURL + '/properties?sharedWith=' + sharedWith
    if (timeExpressionFrom !== undefined && timeInterval !== undefined) {
      url += '&from=' + timeExpressionFrom + '&timeInterval=' + timeInterval
    }
    const headers = this.getHeader()
    return this.http.get(url, { headers }).toPromise()
  }

  async getPropertyTypes(): Promise<PropertyType[]> {
    if (this.propertyTypes) {
      return Promise.resolve(this.propertyTypes)
    }

    const url = this.apiURL + '/types';
    const headers = this.getHeader()

    await this.http
      .get<PropertyType[]>(url, { headers })
      .subscribe(
        propertyTypes => {
          this.propertyTypes = propertyTypes;
        },
        err => {
          console.warn('status', err.status);
        }
      );
    return Promise.resolve(this.propertyTypes)
  }

  csvFileUpload(thingId: string, propertyId: string, fileToUpload: File, hasLabel: boolean): Promise<any> {
    const url = this.apiURL + '/things/' + thingId + '/properties/' + propertyId + '?hasLabel=' + (hasLabel ? 'true' : 'false');
    const headers = this.getHeader()
    const formData: FormData = new FormData();
    formData.append('fileKey', fileToUpload, fileToUpload.name);
    return this.http.put<any>(url, formData, { headers: headers }).toPromise()
  }

  dpiStatus(thingId: string): Promise<any> {
    const url = this.apiURL + '/things/' + thingId + '/types/dpi'
    const headers = this.getHeader()
    return this.http.get(url, { headers }).toPromise()
  }

  dpiCreate(thingId: string, dpi: any): Promise<any> {
    const url = this.apiURL + '/things/' + thingId + '/types/dpi'
    const headers = this.getHeader()
    return this.http.post(url, dpi, { headers }).toPromise()
  }

  dpiCancel(thingId: string): Promise<any> {
    const url = this.apiURL + '/things/' + thingId + '/types/dpi/cancel'
    const headers = new HttpHeaders({ timeout: `${20000}` })
      .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());
    return this.http.get(url, { headers }).toPromise()
  }

  dpiDelete(thingId: string): Promise<any> {
    const url = this.apiURL + '/things/' + thingId + '/types/dpi'
    const headers = this.getHeader()
    return this.http.delete(url, { headers }).toPromise()
  }

  dpiDownload(thingId: string): Observable<Download> {
    const url = this.apiURL + '/things/' + thingId + '/types/dpi'
    const headers = this.getHeader()
    const params = new HttpParams().set('download', 'true')
    const fileName = 'dpi_image_' + thingId.replace('dcd:things:', '') + '.zip'
    return this.http.get(url, {
      headers,
      params,
      reportProgress: true,
      observe: 'events',
      responseType: 'blob'
    }).pipe(download(blob => this.save(blob, fileName)))
  }

  createGrafanaThing(thingId: string) {
    const url = this.apiURL + '/things/' + thingId + '/apps/grafana'
    const headers = this.getHeader()
    return this.http.post(url, {}, { headers }).toPromise()
  }

  getGrafanaId(thingId: string) {
    const url = this.apiURL + '/things/' + thingId + '/apps/grafana/user'
    const headers = this.getHeader()
    return this.http.get(url, { headers }).toPromise()
  }

  getDPiHealth() {
    const url = this.apiURL + '/things/types/dpi/health'
    const headers = this.getHeader()
    return this.http.get(url, { headers }).toPromise()
  }

  getHeader() {
    return new HttpHeaders().set('Accept', 'application/json')
      .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());
  }

  toast(payload: any, type: string = 'danger', icon: string = 'nc-alert-circle-i') {
    let message = ''
    if (typeof (payload) === 'string') {
      message = payload
    } else if (payload.error !== undefined && typeof (payload.error) !== 'string') {
      message = payload.error.name + ' -- ' + payload.error.message
      if (payload.error.requirement) {
        message += '<br>Requirement: ' + payload.error.requirement
      }
      if (payload.error.hint) {
        message += '<br>Hint: ' + payload.error.hint
      }
    } else {
      message = 'Bucket service unavailable.'
    }

    this.toastr.info(
      '<span data-notify="icon" class="nc-icon ' + icon + '"></span><span data-notify="message">' + message + '</span>',
      '',
      {
        timeOut: 4000,
        closeButton: true,
        enableHtml: true,
        toastClass: 'alert alert-' + type + ' alert-with-icon',
        positionClass: 'toast-top-center'
      }
    );
  }

}

export function download(
  saver?: (b: Blob) => void
): (source: Observable<HttpEvent<Blob>>) => Observable<Download> {
  return (source: Observable<HttpEvent<Blob>>) =>
    source.pipe(
      scan((previous: Download, event: HttpEvent<Blob>): Download => {
        if (isHttpProgressEvent(event)) {
          const total = 1166082792
          let progress = Math.round((100 * event.loaded) / total)
          if (progress > 100) {
            progress = 100
          }

          // fix to improve!
          const elem: HTMLElement = document.getElementById('download-dpi-image-progress')
          if (elem) {
            elem.style.width = progress + '%'
          }

          return {
            // progress: event.total
            //   ? Math.round((100 * event.loaded) / event.total)
            //   : previous.progress,
            progress: total
              ? Math.round((100 * event.loaded) / total)
              : previous.progress,
            state: 'IN_PROGRESS',
            content: null
          }
        }
        if (isHttpResponse(event)) {
          if (saver && event.body) {
            saver(event.body)
          }

          const bt: HTMLButtonElement = document.getElementById('downloadImage') as HTMLButtonElement
          if (bt) {
            bt.disabled = false
          }
          const btSpinner: HTMLElement = document.getElementById('spinnerDownloadImage')
          if (btSpinner) {
            btSpinner.style.display = 'none'
          }
          const bar: HTMLElement = document.getElementById('download-dpi-image-progress-bar')
          if (bar) {
            bar.style.display = 'none'
          }

          return {
            progress: 100,
            state: 'DONE',
            content: event.body
          }
        }
        return previous
      },
        { state: 'PENDING', progress: 0, content: null }
      )
    )
}



function isHttpResponse<T>(event: HttpEvent<T>): event is HttpResponse<T> {
  return event.type === HttpEventType.Response
}

function isHttpProgressEvent(event: HttpEvent<unknown>): event is HttpProgressEvent {
  return event.type === HttpEventType.DownloadProgress
    || event.type === HttpEventType.UploadProgress
}
