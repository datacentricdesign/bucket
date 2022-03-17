import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-get-started-cmp',
    moduleId: module.id,
    templateUrl: 'get-started.component.html'
})

export class GetStartedComponent implements OnInit {

    constructor(private route: ActivatedRoute) { }

    ngOnInit() {
        
    }
}
