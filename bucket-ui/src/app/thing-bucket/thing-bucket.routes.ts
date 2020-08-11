import { Routes, RouterModule } from '@angular/router';

import { DashboardComponent } from './dashboard/dashboard.component';
import { ThingComponent } from './thing/thing.component';
import { AuthGuard } from '../shared/auth/auth.guard';
import { ThingBucketComponent } from './thing-bucket.component';
import { PropertyComponent } from './property/property.component';

export const ThingBucketRoutes: Routes = [
    {
        path: '',
        component: ThingBucketComponent,
        canActivate: [AuthGuard],
        children: [
          {
            path: 'dashboard',
            component: DashboardComponent
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
