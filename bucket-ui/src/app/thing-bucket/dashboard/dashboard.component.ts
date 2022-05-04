import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ThingService } from '../services/thing.service';

@Component({
    selector: 'app-dashboard-cmp',
    moduleId: module.id,
    templateUrl: 'dashboard.component.html'
})

export class DashboardComponent implements OnInit {

    constructor(private route: ActivatedRoute,
        private thingService: ThingService) { }

    ngOnInit() {
        this.route.queryParams
            .subscribe(params => {
                if (params.success !== undefined) {
                    this.thingService.toast(params.success, 'success')
                } else if (params.error !== undefined) {
                    this.thingService.toast(params.error, 'danger')
                }
            }
            );
    }
}
