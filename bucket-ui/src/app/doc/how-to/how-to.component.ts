import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-how-to-cmp',
    moduleId: module.id,
    templateUrl: 'how-to.component.html'
})

export class HowToComponent implements OnInit {

    constructor(private route: ActivatedRoute) { }

    ngOnInit() {
        
    }
}
