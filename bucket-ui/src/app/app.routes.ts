import { Routes } from '@angular/router';
import { GetStartedComponent } from './doc/get-started/get-started.component';
import { TutorialsComponent } from './doc/tutorials/tutorials.component';
import { ReferencesComponent } from './doc/references/references.component';
import { ExplanationsComponent } from './doc/explanations/explanations.component';
import { HowToComponent } from './doc/how-to/how-to.component';
import { LandingPageComponent } from './landing-page/landing-page.component';

export const AppRoutes: Routes = [
  {
    path: '',
    redirectTo: 'about',
    pathMatch: 'full'
  },
  {
    path: 'about',
    component: LandingPageComponent,
    children: [
      {
        path: 'get-started',
        component: GetStartedComponent
      },
      {
        path: 'references',
        component: ReferencesComponent
      },
      {
        path: 'tutorials',
        component: TutorialsComponent
      },
      {
        path: 'how-to',
        component: HowToComponent
      },
      {
        path: 'explanations',
        component: ExplanationsComponent
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'about'
  }
];
