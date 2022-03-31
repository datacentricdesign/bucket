import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { Thing } from '@datacentricdesign/types';
import { catchError, map } from 'rxjs/operators';
import { AppService } from 'app/app.service';
import { OAuthService } from 'angular-oauth2-oidc';
import { ThingService } from 'app/thing-bucket/services/thing.service';

export interface RouteInfo {
    path: string;
    title: string;
    icon: string;
    class: string;
}

const dashboardRoute = { path: '/things', title: 'Dashboard', icon: 'nc-layout-11', class: '' }
const sharedPropertiesRoute = { path: '/things/shared-properties', title: 'Shared Properties', icon: 'nc-share-66', class: '' }

export const ROUTES: RouteInfo[] = [dashboardRoute, sharedPropertiesRoute];

@Component({
    moduleId: module.id,
    selector: 'app-sidebar-cmp',
    templateUrl: 'sidebar.component.html',
    styleUrls: ['sidebar.component.css']
})

export class SidebarComponent implements OnInit {
    public menuItems: any[];
    serviceSubscription: any

    constructor(private thingService: ThingService) { }

    ngOnInit() {
        this.menuItems = ROUTES.filter(menuItem => menuItem);

        this.thingService.find()
            .then((things: any) => {
                this.thingsToMenu(things)
            })
            .catch((error) => {
                this.thingService.toast(error)
            })
    }

    thingsToMenu(things: Thing[]) {
        for (let index = 0; index < things.length; index++) {
            const t = things[index]
            this.menuItems.push({ path: t.id, title: t.name, type: 'thing', icon: 'nc-app', class: '' })
            for (let indexP = 0; indexP < t.properties.length; indexP++) {
                const p = t.properties[indexP]
                this.menuItems.push({
                    path: t.id + '/properties/' + p.id, type: 'property',
                    title: p.name, icon: 'nc-sound-wave', class: ''
                })
            }
        }
    }

    updateThing(id: string, name: string) {
        for (let i = 0; i < this.menuItems.length; i++) {
            if (this.menuItems[i].path === id) {
                this.menuItems[i].title = name
            }
        }
    }
}
