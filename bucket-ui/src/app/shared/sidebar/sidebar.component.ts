import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { Thing } from '@datacentricdesign/types';
import { catchError, map } from 'rxjs/operators';
import { AppService } from 'app/app.service';
import { OAuthService } from 'angular-oauth2-oidc';

export interface RouteInfo {
    path: string;
    title: string;
    icon: string;
    class: string;
}

const dashboardRoute = { path: '/things/dashboard', title: 'Dashboard', icon: 'nc-layout-11', class: '' }
const exploreRoute = { path: '/things/explore', title: 'Shared Properties', icon: 'nc-share-66', class: '' }

export const ROUTES: RouteInfo[] = [dashboardRoute, exploreRoute];

@Component({
    moduleId: module.id,
    selector: 'sidebar-cmp',
    templateUrl: 'sidebar.component.html',
    styleUrls: ['sidebar.component.css']
})

export class SidebarComponent implements OnInit {
    public menuItems: any[];

    private apiURL: string

    things$: Observable<Thing[]>;
    things: Thing[]

    constructor(private http: HttpClient, private appService: AppService, private oauthService: OAuthService) {
        this.apiURL = appService.settings.apiURL;
    }


    ngOnInit() {
        this.menuItems = ROUTES.filter(menuItem => menuItem);
        let headers = new HttpHeaders().set('Accept', 'application/json')
        .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());

        this.http.get(this.apiURL + "/things", {headers}).subscribe((data: any) => {
            for (let index = 0; index < data.length; index++) {
                const t = data[index]
                this.menuItems.push({ path: t.id, title: t.name, type: 'thing', icon: 'nc-app', class: '' })
                for (let indexP = 0; indexP < t.properties.length; indexP++) {
                    const p = t.properties[indexP]
                    this.menuItems.push({ path: t.id + '/properties/' + p.id, type: 'property', title: p.name, icon: 'nc-sound-wave', class: '' })
                }   
            }            
        });
    }
}
