import { Routes } from '@angular/router';

import { LandingPageComponent } from './landing-page/landing-page.component';

export const AppRoutes: Routes = [
  {
    path: '',
    redirectTo: 'about',
    pathMatch: 'full'
  },
  {
    path: 'about',
    component: LandingPageComponent
  },
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./thing-bucket/thing-bucket.module').then(
        mod => mod.ThingBucketModule
      )
  },
  {
    path: '**',
    redirectTo: 'about'
  }
];