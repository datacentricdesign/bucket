import { Routes, RouterModule } from '@angular/router';

import { DashboardComponent } from './dashboard/dashboard.component';
import { ThingComponent } from './thing/thing.component';
import { AuthGuard } from '../shared/auth/auth.guard';
import { ThingBucketComponent } from './thing-bucket.component';

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
            path: 'thing/:id',
            component: ThingComponent
          }
        ]
      }
];

export let ThingBucketRouterModule = RouterModule.forChild(
    ThingBucketRoutes
);
