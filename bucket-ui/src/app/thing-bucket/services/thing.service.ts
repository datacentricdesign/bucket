import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BASE_URL } from '../../app.tokens';
import { Observable } from 'rxjs';
import { Thing } from '@datacentricdesign/types';
import { OAuthService } from 'angular-oauth2-oidc';

@Injectable()
export class ThingService {
  constructor(
    private oauthService: OAuthService,
    private http: HttpClient,
    @Inject(BASE_URL) private baseUrl: string
  ) {}

  public things: Array<Thing> = [];

  find(): void {
    let url = this.baseUrl + '/things';
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
}
