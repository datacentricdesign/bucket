import { Component } from '@angular/core';
import { AuthConfig, OAuthService } from 'angular-oauth2-oidc';
import { filter } from 'rxjs/operators';
import { Router } from '@angular/router';
import { authCodeFlowConfig } from './auth-code-flow.config';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  constructor(private router: Router, private oauthService: OAuthService) {
    this.configureCodeFlow();

    // Automatically load user profile
    this.oauthService.events
      .pipe(filter(e => e.type === 'token_received'))
      .subscribe(_ => {
        this.oauthService.loadUserProfile();
        window.location.href = './things/dashboard'
      });

    // Display all events
    this.oauthService.events.subscribe(e => {
      // console.debug('oauth/oidc event', e);
    });
  }

  ngOnInit() {
  }

  private configureCodeFlow() {
    this.oauthService.configure(authCodeFlowConfig);
    this.oauthService.requestAccessToken = true;
    this.oauthService.loadDiscoveryDocumentAndTryLogin();
  }
}