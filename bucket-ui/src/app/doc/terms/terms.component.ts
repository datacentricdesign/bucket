import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-terms-cmp',
    moduleId: module.id,
    templateUrl: 'terms.component.html'
})

export class TermsComponent implements OnInit {

    constructor(private route: ActivatedRoute) { }

    ngOnInit() {
        
    }
}
