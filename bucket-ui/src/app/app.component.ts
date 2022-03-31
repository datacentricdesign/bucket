import { Component, OnInit } from '@angular/core';
import { AuthConfig, OAuthService } from 'angular-oauth2-oidc';
import { filter } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AppService } from './app.service';


export interface RouteInfo {
  path: string;
  title: string;
  icon: string;
  class: string;
}

const getStartedRoute = { path: '/get-started', title: 'Get Started', icon: 'nc-user-run', class: '' }
const tutorialsRoute = { path: '/tutorials', title: 'Tutorials', icon: 'nc-spaceship', class: '' }
const howToRoute = { path: '/how-to', title: 'How-To Guides', icon: 'nc-bullet-list-67', class: '' }
const technicalRefRoute = { path: '/references', title: 'Technical References', icon: 'nc-book-bookmark', class: '' }
const explanationRoute = { path: '/explanations', title: 'Background Info', icon: 'nc-single-copy-04', class: '' }

export const ROUTES: RouteInfo[] = [getStartedRoute, tutorialsRoute, howToRoute, technicalRefRoute, explanationRoute];

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  public menuItems: any[];

  constructor(private router: Router, private oauthService: OAuthService, private appService: AppService) {
    this.configureCodeFlow();

    // Automatically load user profile
    this.oauthService.events
      .pipe(filter(e => e.type === 'token_received'))
      .subscribe(_ => {
        this.oauthService.loadUserProfile();
        window.location.href = './things'
      });

    // Display all events
    this.oauthService.events.subscribe(e => {
      // console.debug('oauth/oidc event', e);
    });
  }

  ngOnInit(): void {
    this.menuItems = ROUTES.filter(menuItem => menuItem);
  }

  private configureCodeFlow() {
    this.oauthService.configure(<AuthConfig> this.appService.settings.authCodeFlow);
    this.oauthService.requestAccessToken = true;
    this.oauthService.loadDiscoveryDocumentAndTryLogin();
  }
}
