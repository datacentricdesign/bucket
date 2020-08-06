import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { Observable, throwError } from 'rxjs';

import { map, catchError } from 'rxjs/operators';
import { Thing } from '@datacentricdesign/types';
import { AppService } from 'app/app.service';

@Component({
    selector: 'thing-cmp',
    moduleId: module.id,
    templateUrl: 'thing.component.html'
})
export class ThingComponent implements OnInit {

    private apiURL: string

    thing$: Observable<Thing>;

    id: string;
    description: string
    name: string
    thing: Thing

    constructor(private _Activatedroute: ActivatedRoute,
        private _router: Router,
        private http: HttpClient,
        private appService: AppService) {
            this.apiURL = appService.settings.apiURL
    }

    ngOnInit() {
        this._Activatedroute.paramMap.subscribe(params => {
            this.id = params.get('id');
             this.thing$ = this.http.get<Thing>(this.apiURL + "/things/" + this.id).pipe(
                map((data: Thing) => {
                    this.thing = data
                    return data;
                }), catchError(error => {
                    return throwError('Thing not found!');
                })
            )
        });


       
    }
}