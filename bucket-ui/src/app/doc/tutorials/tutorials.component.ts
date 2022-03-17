import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-tutorials-cmp',
    moduleId: module.id,
    templateUrl: 'tutorials.component.html'
})

export class TutorialsComponent implements OnInit {

    constructor(private route: ActivatedRoute) { }

    ngOnInit() {
        
    }
}
