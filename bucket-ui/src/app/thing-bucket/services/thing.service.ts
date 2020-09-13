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
    @Inject(SAVER) private save: Saver
  ) {
    console.log('constructor thing service')
    this.apiURL = appService.settings.apiURL;
  }

  public things: Array<Thing> = [];

  find(): void {
    let url = this.apiURL + '/things';
    let headers = new HttpHeaders().set('Accept', 'application/json')
      .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());

    // let params = new HttpParams().set('from', from).set('to', to);

    this.http
      .get<Thing[]>(url, { headers/*, params*/ })
      .subscribe(
        things => {
          this.things = things;
        },
        err => {
          console.warn('status', err.status);
        }
      );
  }

  getPropertyValues(thingId: string, propertyId: string, options: ValueOptions, csvFormat: boolean): void {
    let url = this.apiURL + '/things/' + thingId + '/properties/' + propertyId;
    let params = new HttpParams()
      .set('from', options.from + '')
      .set('to', options.to + '')
    if (options.fctInterval !== undefined) params.set('fctInterval', options.fctInterval + '')
    if (options.timeInterval !== undefined) params.set('timeInterval', options.timeInterval)
    if (options.fill !== undefined) params.set('fill', options.fill)
    console.log(params)
    let headers = new HttpHeaders().set('Accept', csvFormat ? 'text/csv' : 'application/json')
      .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken())


    this.http
      .get(url, { headers, params, responseType: 'blob' as 'blob' })
      .subscribe(
        blob => {
          const a = document.createElement('a')
          const objectUrl = URL.createObjectURL(blob)
          a.href = objectUrl
          a.download = propertyId + '.csv';
          a.click();
          URL.revokeObjectURL(objectUrl);
        },
        err => {
          console.warn('status', err.status);
        }
      );
  }

  edit(thingId: string, fields: DTOThing): void {
    let url = this.apiURL + '/things/' + thingId;
    let headers = new HttpHeaders().set('Accept', 'application/json')
      .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());

    const body: DTOThing = {}
    if (fields.name !== undefined && fields.name !== '') {
      body.name = fields.name;
    }
    if (fields.description !== undefined && fields.description !== '') {
      body.description = fields.description;
    }
    console.log(body)
    this.http.patch(url, body, { headers })
      .subscribe(
        result => {
          window.location.reload(true);
        },
        err => {
          console.warn('status', err.status);
        }
      );
  }

  updatePEM(thingId: string, pem: string): void {
    let url = this.apiURL + '/things/' + thingId + "/pem";
    let headers = new HttpHeaders().set('Accept', 'application/json')
      .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());

    this.http.patch(url, { pem: pem }, { headers })
      .subscribe(
        result => {
          window.location.reload(true);
        },
        err => {
          console.warn('status', err.status);
        }
      );
  }

  delete(thingId: string): void {
    let url = this.apiURL + '/things/' + thingId;
    let headers = new HttpHeaders().set('Accept', 'application/json')
      .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());

    this.http.delete(url, { headers })
      .subscribe(
        result => {
          window.location.href = './things/dashboard';
        },
        err => {
          console.warn('status', err.status);
        }
      );
  }

  grant(thingId: string, propertyId: string, subjects: string[], actions: string[]): void {
    let url = this.apiURL + '/things/' + thingId + '/properties/' + propertyId + '/consents';
    let headers = new HttpHeaders().set('Accept', 'application/json')
      .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());

    this.http.post(url, { subjects: subjects, actions: actions }, { headers })
      .subscribe(
        result => {
          window.location.reload();
        },
        err => {
          console.warn('status', err.status);
        }
      );
  }

  revoke(thingId: string, propertyId: string, consentId: string): void {
    let url = this.apiURL + '/things/' + thingId + '/properties/' + propertyId + '/consents/' + consentId;
    let headers = new HttpHeaders().set('Accept', 'application/json')
      .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());

    this.http.delete(url, { headers })
      .subscribe(
        result => {
          window.location.reload();
        },
        err => {
          console.warn('status', err.status);
        }
      );
  }

  editProperty(thingId: string, propertyId: string, fields: DTOProperty): void {
    let url = this.apiURL + '/things/' + thingId + '/properties/' + propertyId;
    let headers = new HttpHeaders().set('Accept', 'application/json')
      .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());

    const body: DTOProperty = {}
    if (fields.name !== undefined && fields.name !== '') {
      body.name = fields.name;
    }
    if (fields.description !== undefined && fields.description !== '') {
      body.description = fields.description;
    }
    console.log(body)
    this.http.patch(url, body, { headers })
      .subscribe(
        result => {
          window.location.reload(true);
        },
        err => {
          console.warn('status', err.status);
        }
      );
  }

  deleteProperty(thingId: string, propertyId: string): void {
    let url = this.apiURL + '/things/' + thingId + '/properties/' + propertyId;
    let headers = new HttpHeaders().set('Accept', 'application/json')
      .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());

    this.http.delete(url, { headers })
      .subscribe(
        result => {
          window.location.href = './things/' + thingId;
        },
        err => {
          console.warn('status', err.status);
        }
      );
  }

  lastValues(thingId: string, propertyId: string): Promise<any> {
    let url = this.apiURL + '/things/' + thingId + '/properties/' + propertyId + '/last';
    let headers = new HttpHeaders().set('Accept', 'application/json')
      .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());

    return this.http.get(url, { headers }).toPromise()
    // .subscribe(
    //   result => {
    //     return Promise.resolve(result)
    //   },
    //   err => {
    //     console.warn('status', err.status);
    //     return Promise.reject(error)
    //   }
    // );
  }

  dpCount(timeExpressionFrom, timeInterval?): Promise<any> {
    let url = this.apiURL + '/things/count?from=' + timeExpressionFrom
    if (timeInterval !== undefined) url += '&timeInterval=' + timeInterval;
    let headers = new HttpHeaders().set('Accept', 'application/json')
      .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());

    return this.http.get(url, { headers }).toPromise()
  }

  async getPropertyTypes(): Promise<PropertyType[]> {
    if (this.propertyTypes) return Promise.resolve(this.propertyTypes)

    let url = this.apiURL + '/types';
    let headers = new HttpHeaders().set('Accept', 'application/json')
      .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());

    await this.http
      .get<PropertyType[]>(url, { headers })
      .subscribe(
        propertyTypes => {
          console.log(propertyTypes)
          this.propertyTypes = propertyTypes;
        },
        err => {
          console.warn('status', err.status);
        }
      );
    return Promise.resolve(this.propertyTypes)
  }

  csvFileUpload(thingId: string, propertyId: string, fileToUpload: File, hasLabel: boolean): Observable<boolean> {
    let url = this.apiURL + '/things/' + thingId + '/properties/' + propertyId + '?hasLabel=' + (hasLabel ? 'true' : 'false');

    let headers = new HttpHeaders().set('Accept', 'application/json')
      .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());

    const formData: FormData = new FormData();
    formData.append('fileKey', fileToUpload, fileToUpload.name);
    return this.http.put<any>(url, formData, { headers: headers })
  }

  dpiStatus(thingId: string): Promise<any> {
    let url = this.apiURL + '/things/' + thingId + '/types/dpi'
    let headers = new HttpHeaders().set('Accept', 'application/json')
      .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());
    return this.http.get(url, { headers }).toPromise()
  }

  dpiCancel(thingId: string): Promise<any> {
    let url = this.apiURL + '/things/' + thingId + '/types/dpi/cancel'
    let headers = new HttpHeaders({ timeout: `${20000}` })
      .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());
    return this.http.get(url, { headers }).toPromise()
  }

  dpiDelete(thingId: string): Promise<any> {
    let url = this.apiURL + '/things/' + thingId + '/types/dpi'
    let headers = new HttpHeaders().set('Accept', 'application/json')
      .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());
    return this.http.delete(url, { headers }).toPromise()
  }

  // dpiDownload(thingId: string) {
  //   let url = this.apiURL + '/things/' + thingId + '/types/dpi'
  //   let headers = new HttpHeaders().set('Accept', 'application/json')
  //     .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());
  //   let params = new HttpParams().set('download', 'true')
  //   return this.http.get(url, {
  //     headers,
  //     params,
  //     responseType: 'blob' as 'blob',
  //     reportProgress: true,
  //     observe: 'events',
  //   }).toPromise()
  // }

  dpiDownload(thingId: string): Observable<Download> {
    let url = this.apiURL + '/things/' + thingId + '/types/dpi'
    let headers = new HttpHeaders().set('Accept', 'application/json')
      .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());
    let params = new HttpParams().set('download', 'true')
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
    let url = this.apiURL + '/things/' + thingId + '/apps/grafana'
    let headers = new HttpHeaders().set('Accept', 'application/json')
      .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());
    return this.http.post(url, { headers }).toPromise()
  }

  getGrafanaId(thingId: string) {
    let url = this.apiURL + '/things/' + thingId + '/apps/grafana/user'
    let headers = new HttpHeaders().set('Accept', 'application/json')
      .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());
    return this.http.get(url, { headers }).toPromise()
  }

}

export function download(
  saver?: (b: Blob) => void
): (source: Observable<HttpEvent<Blob>>) => Observable<Download> {
  return (source: Observable<HttpEvent<Blob>>) =>
    source.pipe(
      scan((previous: Download, event: HttpEvent<Blob>): Download => {
        console.log(event)
        if (isHttpProgressEvent(event)) {
          const total = 1166082792
          let progress = Math.round((100 * event.loaded) / total)
          if (progress>100) progress = 100
          
          // fix to improve!
          const elem:HTMLElement = document.getElementById("download-dpi-image-progress")
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

          const bt:HTMLButtonElement = document.getElementById("downloadImage") as HTMLButtonElement
          if (bt) bt.disabled = false
          const btSpinner:HTMLElement = document.getElementById("spinnerDownloadImage")
          if (btSpinner) btSpinner.style.display = 'none'
          const bar:HTMLElement = document.getElementById("download-dpi-image-progress-bar")
          if (bar) bar.style.display = 'none'

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