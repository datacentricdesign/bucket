import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { Thing } from '@datacentricdesign/types';
import { catchError, map } from 'rxjs/operators';
import { AppService } from 'app/app.service';

export interface RouteInfo {
    path: string;
    title: string;
    icon: string;
    class: string;
}

const dashboardRoute = { path: '/dashboard', title: 'Dashboard', icon: 'nc-bank', class: '' }

export const ROUTES: RouteInfo[] = [dashboardRoute];

@Component({
    moduleId: module.id,
    selector: 'sidebar-cmp',
    templateUrl: 'sidebar.component.html',
})

export class SidebarComponent implements OnInit {
    public menuItems: any[];

    private apiURL: string

    things$: Observable<Thing[]>;
    things: Thing[]

    constructor(private http: HttpClient, private appService: AppService) {
        this.apiURL = appService.settings.apiURL;
    }


    ngOnInit() {
        this.menuItems = ROUTES.filter(menuItem => menuItem);

        this.http.get(this.apiURL + "/things").subscribe((data: any) => {
            console.log(data)
            for (let index = 0; index < data.length; index++) {
                this.menuItems.push({ path: 'thing/' + data[index].id, title: data[index].name, icon: 'nc-bank', class: '' })
            }            
        });
    }
}
