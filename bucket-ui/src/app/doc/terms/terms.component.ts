import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-terms-cmp',
    moduleId: module.id,
    templateUrl: 'terms.component.html'
})

export class TermsComponent implements OnInit {

    constructor(private route: ActivatedRoute, private titleService: Title) { }

    ngOnInit() {
        this.titleService.setTitle("Terms - Bucket");
    }
}
