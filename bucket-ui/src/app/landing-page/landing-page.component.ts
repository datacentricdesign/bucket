import { Component, OnInit } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { ActivatedRoute } from '@angular/router';
import { authCodeFlowConfig } from 'app/auth-code-flow.config';

@Component({
  selector: 'app-landing-page',
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.css']
})
export class LandingPageComponent implements OnInit {
  loginFailed: boolean = false;
  userProfile: object;
  login: false;

  constructor(
    private route: ActivatedRoute,
    private oauthService: OAuthService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(p => {
      this.login = p['login'];
    });
    if (this.oauthService.hasValidAccessToken() && this.oauthService.hasValidIdToken()) {
      this.userProfile = this.oauthService.getIdentityClaims()
    }
  }

  async loginCode() {
    // Tweak config for code flow
    this.oauthService.configure(authCodeFlowConfig);
    await this.oauthService.loadDiscoveryDocument();
    this.oauthService.requestAccessToken = true;

    this.oauthService.initLoginFlow('/some-state;p1=1;p2=2?p3=3&p4=4');
    // the parameter here is optional. It's passed around and can be used after logging in
  }

  logout() {
    // this.oauthService.logOut();
    this.oauthService.revokeTokenAndLogout();
  }

  loadUserProfile(): void {
    this.oauthService.loadUserProfile().then(up => (this.userProfile = up));
  }

  refresh() {
    this.oauthService.oidc = true;

    this.oauthService
      .refreshToken()
      .then(info => console.debug('refresh ok', info))
      .catch(err => console.error('refresh error', err));

  }

  set requestAccessToken(value: boolean) {
    this.oauthService.requestAccessToken = value;
    localStorage.setItem('requestAccessToken', '' + value);
  }

  get requestAccessToken() {
    return this.oauthService.requestAccessToken;
  }

  set useHashLocationStrategy(value: boolean) {
    const oldValue = localStorage.getItem('useHashLocationStrategy') === 'true';
    if (value !== oldValue) {
      localStorage.setItem('useHashLocationStrategy', value ? 'true' : 'false');
      window.location.reload();
    }
  }

  get useHashLocationStrategy() {
    return localStorage.getItem('useHashLocationStrategy') === 'true';
  }

  get id_token() {
    return this.oauthService.getIdToken();
  }

  get access_token() {
    return this.oauthService.getAccessToken();
  }

  get id_token_expiration() {
    return this.oauthService.getIdTokenExpiration();
  }

  get access_token_expiration() {
    return this.oauthService.getAccessTokenExpiration();
  }

}
