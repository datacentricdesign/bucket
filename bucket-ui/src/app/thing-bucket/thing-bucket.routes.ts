import { Routes, RouterModule } from '@angular/router';

import { DashboardComponent } from './dashboard/dashboard.component';
import { ThingComponent } from './thing/thing.component';
import { AuthGuard } from '../shared/auth/auth.guard';
import { ThingBucketComponent } from './thing-bucket.component';
import { PropertyComponent } from './property/property.component';
import { SharedPropertiesComponent } from './shared-properties/shared-properties.component';
import { PropertyTypesComponent } from './property-types/property-types.component';

export const ThingBucketRoutes: Routes = [
    {
        path: '',
        component: ThingBucketComponent,
        canActivate: [AuthGuard],
        children: [
          {
            path: '',
            component: DashboardComponent
          },
          {
            path: 'shared-properties',
            component: SharedPropertiesComponent
          },
          {
            path: 'types',
            component: PropertyTypesComponent
          },
          {
            path: ':id',
            component: ThingComponent
          },
          {
            path: ':id/properties/:propertyId',
            component: PropertyComponent
          }
        ]
      }
];

export let ThingBucketRouterModule = RouterModule.forChild(
    ThingBucketRoutes
);
