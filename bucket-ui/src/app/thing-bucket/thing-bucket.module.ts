import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ThingBucketRouterModule } from './thing-bucket.routes';

import { DashboardComponent } from './dashboard/dashboard.component';
import { ThingComponent } from './thing/thing.component';
import { PropertyComponent } from './property/property.component';
import { ThingConnectedComponent } from './thing-connected/thing-connected.component';
import { ThingStatsComponent } from './thing-stats/thing-stats.component';
import {AutocompleteLibModule} from 'angular-ng-autocomplete';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ReactiveFormsModule } from '@angular/forms';
import { ThingService } from './services/thing.service';
import { SharedModule } from 'app/shared/shared.module';
import { ExploreComponent } from './explore/explore.component';
import { ThingFormComponent } from './thing-form/thing-form.component';
import { RaspberryPiThingComponent } from './raspberry-pi-thing/raspberry-pi-thing.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    NgbModule,
    ReactiveFormsModule,
    SharedModule,
    ThingBucketRouterModule,
    AutocompleteLibModule
  ],
  declarations: [
    DashboardComponent,
    ThingComponent,
    PropertyComponent,
    ThingConnectedComponent,
    ThingStatsComponent,
    ThingFormComponent,
    ThingStatsComponent,
    RaspberryPiThingComponent,
    ExploreComponent
  ],
  providers: [ThingService],
})

export class ThingBucketModule { }
