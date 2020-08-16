import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { OAuthService } from 'angular-oauth2-oidc';
import { Title } from '@angular/platform-browser';
import { AppService } from 'app/app.service';
import { ThingService } from '../services/thing.service';
import { Property } from '@datacentricdesign/types';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
  selector: 'app-explore',
  templateUrl: './explore.component.html',
  styleUrls: ['./explore.component.css']
})
export class ExploreComponent implements OnInit {

  private apiURL: string

  properties$: Observable<Property[]>;
  properties: Property[]

  constructor(private _Activatedroute: ActivatedRoute,
    private _router: Router,
    private http: HttpClient,
    private oauthService: OAuthService,
    private titleService: Title,
    private appService: AppService,
    private thingService: ThingService) {
    this.apiURL = appService.settings.apiURL
  }

  ngOnInit(): void {
    this._Activatedroute.paramMap.subscribe(params => {
      let headers = new HttpHeaders().set('Accept', 'application/json')
        .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());
      this.properties$ = this.http.get<Property[]>(this.apiURL + "/properties", { headers }).pipe(
        map((data: Property[]) => {
          console.log(data)
          this.properties = data
          return data;
        }), catchError(error => {
          console.log(error)
          return throwError('Properties not found!');
        })
      )
    });
  }

}
