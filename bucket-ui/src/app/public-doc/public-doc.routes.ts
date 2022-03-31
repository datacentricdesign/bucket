import { Routes, RouterModule } from '@angular/router';

import { GetStartedComponent } from './get-started/get-started.component';
import { TutorialsComponent } from './tutorials/tutorials.component';
import { ReferencesComponent } from './references/references.component';
import { ExplanationsComponent } from './explanations/explanations.component';
import { HowToComponent } from './how-to/how-to.component';
import { TermsComponent } from './terms/terms.component';
import { PrivacyComponent } from './privacy/privacy.component';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { PublicDocComponent } from './public-doc.component';

export const PublicDocRoutes: Routes = [
  {
    path: '',
    component: PublicDocComponent,
    children: [
      {
        path: '',
        component: LandingPageComponent
      },
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
      },
      {
        path: 'privacy',
        component: PrivacyComponent
      },
      {
        path: 'terms',
        component: TermsComponent
      }
    ]
  }
];

export let PublicDocRouterModule = RouterModule.forChild(
    PublicDocRoutes
);
