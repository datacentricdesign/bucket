import { Routes } from '@angular/router';

export const AppRoutes: Routes = [
  {
    path: 'things',
    loadChildren: () =>
      import('./thing-bucket/thing-bucket.module').then(
        mod => mod.ThingBucketModule
      )
  },
  {
    path: '',
    loadChildren: () =>
      import('./public-doc/public-doc.module').then(
        mod => mod.PublicDocModule
      )
  },
  {
    path: '**',
    redirectTo: ''
  }
];
