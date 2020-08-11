import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ThingBucketRouterModule } from './thing-bucket.routes';

import { DashboardComponent } from './dashboard/dashboard.component';
import { ThingComponent } from './thing/thing.component';
import { PropertyComponent } from './property/property.component';
import { ThingConnectedComponent } from '../shared/thing-connected/thing-connected.component';
import { ThingStatsComponent } from '../shared/thing-stats/thing-stats.component';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ReactiveFormsModule } from '@angular/forms';
import { ThingService } from './services/thing.service';
import { SharedModule } from 'app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    NgbModule,
    ReactiveFormsModule,
    SharedModule,
    ThingBucketRouterModule
  ],
  declarations: [
    DashboardComponent,
    ThingComponent,
    PropertyComponent,
    ThingConnectedComponent,
    ThingStatsComponent
  ],
  providers: [ThingService],
})

export class ThingBucketModule { }
