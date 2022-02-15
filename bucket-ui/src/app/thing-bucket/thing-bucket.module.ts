import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ThingBucketRouterModule } from './thing-bucket.routes';

import { DashboardComponent } from './dashboard/dashboard.component';
import { ThingComponent } from './thing/thing.component';
import { PropertyComponent } from './property/property.component';
import { ThingConnectedComponent } from './thing-connected/thing-connected.component';
import { ThingStatsComponent } from './thing-stats/thing-stats.component';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ReactiveFormsModule } from '@angular/forms';
import { ThingService } from './services/thing.service';
import { SharedModule } from 'app/shared/shared.module';
import { SharedPropertiesComponent } from './shared-properties/shared-properties.component';
import { SharedPropertiesStatsComponent } from './shared-properties-stats/shared-properties-stats.component';
import { ThingFormComponent } from './thing-form/thing-form.component';
import { RaspberryPiThingComponent } from './raspberry-pi-thing/raspberry-pi-thing.component';
import { GoProThingComponent } from './go-pro-thing/go-pro-thing.component';
import { SAVER, getSaver } from './services/saver.provider';
import { SpinnerButtonComponent } from './spinner-button/spinner-button.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    NgbModule,
    ReactiveFormsModule,
    ThingBucketRouterModule
  ],
  declarations: [
    DashboardComponent,
    ThingComponent,
    PropertyComponent,
    ThingConnectedComponent,
    ThingStatsComponent,
    ThingFormComponent,
    RaspberryPiThingComponent,
    GoProThingComponent,
    SharedPropertiesComponent,
    SharedPropertiesStatsComponent,
    SpinnerButtonComponent
  ],
  providers: [
    ThingService,
    {provide: SAVER, useFactory: getSaver}
  ],
})

export class ThingBucketModule { }
