import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BASE_URL } from '../../app.tokens';
import { Observable } from 'rxjs';
import { Thing, PropertyType, DTOThing, DTOProperty, ValueOptions, Property } from '@datacentricdesign/types';
import { OAuthService } from 'angular-oauth2-oidc';
import { AppService } from 'app/app.service';

@Injectable()
export class ThingService {

  private apiURL: string
  public propertyTypes: PropertyType[]

  constructor(
    private oauthService: OAuthService,
    private http: HttpClient,
    private appService: AppService
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

  getPropertyValues(thingId: string, propertyId: string, options: ValueOptions, csvFormat:boolean): void {
    let url = this.apiURL + '/things/' + thingId + '/properties/' + propertyId;
    let params = new HttpParams()
      .set('from', options.from + '')
      .set('to', options.to + '')
    if (options.fctInterval !== undefined) params.set('fctInterval', options.fctInterval + '')
    if (options.timeInterval !== undefined) params.set('timeInterval', options.timeInterval)
    if (options.fill !== undefined) params.set('fill', options.fill)
    console.log(params)
    let headers = new HttpHeaders().set('Accept', csvFormat?'text/csv':'application/json')
      .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken())


    this.http
      .get(url, { headers, params, responseType: 'blob' as 'blob'})
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
          window.location.href = './things';
        },
        err => {
          console.warn('status', err.status);
        }
      );
  }

  grant(thingId: string, propertyId:string, subjects:string[], actions:string[]): void {
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

  revoke(thingId: string, propertyId:string, consentId: string): void {
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
    if (timeInterval!==undefined) url += '&timeInterval=' + timeInterval;
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
}
