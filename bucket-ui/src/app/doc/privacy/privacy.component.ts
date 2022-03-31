import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-privacy-cmp',
    moduleId: module.id,
    templateUrl: 'privacy.component.html'
})

export class PrivacyComponent implements OnInit {

    constructor(private route: ActivatedRoute, private titleService: Title) { }

    ngOnInit() {
        this.titleService.setTitle("Privacy - Bucket");
    }
}
