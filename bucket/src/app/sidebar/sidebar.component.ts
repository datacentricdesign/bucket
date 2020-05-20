import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
// import { Thing } from '../../../../bucket-api/types';
import { catchError, map } from 'rxjs/operators';

export interface Thing {
    id: string;
    name: string;
    last_update: number;
    lastUpdateText: string;
    controls: string[];
    controls_formated: string[];
}

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

    things$: Observable<Thing[]>;
    things: Thing[]

    constructor(private http: HttpClient) { }


    ngOnInit() {
        this.menuItems = ROUTES.filter(menuItem => menuItem);

        this.http.get("http://localhost:8080/things").subscribe((data: any) => {
            console.log(data)
            for (let index = 0; index < data.length; index++) {
                this.menuItems.push({ path: '/thing/' + data[index].id, title: data[index].name, icon: 'nc-bank', class: '' })
            }            
        });
    }
}
