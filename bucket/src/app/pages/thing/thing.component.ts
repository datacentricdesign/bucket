import { Component, OnInit } from '@angular/core';
import Chart from 'chart.js';
import { Thing } from '../../sidebar/sidebar.component'
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
    selector: 'thing-cmp',
    moduleId: module.id,
    templateUrl: 'thing.component.html'
})
export class ThingComponent implements OnInit {

    thing: Thing;
    id: string;
    description: string
    name: string

    constructor(private _Activatedroute: ActivatedRoute,
        private _router: Router,
        private http: HttpClient) {
    }

    ngOnInit() {
        this._Activatedroute.paramMap.subscribe(params => {
            console.log(params);
            this.id = params.get('id');
            this.http.get("http://localhost:8080/things/" + this.id).subscribe((data: any) => {
                this.name = data.name
                this.description = data.description
                this.thing = data
            });
        });
    }
}