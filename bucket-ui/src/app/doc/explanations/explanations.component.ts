import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-explanations-cmp',
    moduleId: module.id,
    templateUrl: 'explanations.component.html'
})

export class ExplanationsComponent implements OnInit {

    constructor(private route: ActivatedRoute) { }

    ngOnInit() {
        
    }
}
