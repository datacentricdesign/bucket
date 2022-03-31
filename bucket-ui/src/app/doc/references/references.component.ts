import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-references-cmp',
    moduleId: module.id,
    templateUrl: 'references.component.html'
})

export class ReferencesComponent implements OnInit {

    constructor(private route: ActivatedRoute, private titleService: Title) { }

    ngOnInit() {
        this.titleService.setTitle("References - Bucket");
    }
}
