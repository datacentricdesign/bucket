import { Component, OnInit } from '@angular/core';
import { AuthConfig, OAuthService } from 'angular-oauth2-oidc';
import { ActivatedRoute } from '@angular/router';
import { AppService } from 'app/app.service';


@Component({
  selector: 'app-landing-page',
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.css']
})
export class LandingPageComponent implements OnInit {

  public text: string;

  loginFailed = false;
  userProfile: object;
  login: false;

  constructor(
    private route: ActivatedRoute,
    private oauthService: OAuthService,
    private appService: AppService
  ) {}

  async ngOnInit(): Promise<void> {
    const response = await fetch('https://raw.githubusercontent.com/datacentricdesign/bucket/master/README.md');
    this.text = await response.text();
    this.route.params.subscribe(p => {
      this.login = p['login'];
    });
    if (this.oauthService.hasValidAccessToken() && this.oauthService.hasValidIdToken()) {
      this.userProfile = this.oauthService.getIdentityClaims()
    }
  }

  async loginCode() {
    // Tweak config for code flow
    this.oauthService.configure(<AuthConfig> this.appService.settings.authCodeFlow);
    await this.oauthService.loadDiscoveryDocument();
    this.oauthService.requestAccessToken = true;

    this.oauthService.initLoginFlow('/some-state;p1=1;p2=2?p3=3&p4=4');
    // the parameter here is optional. It's passed around and can be used after logging in
  }

  logout() {
    // this.oauthService.logOut();
    this.oauthService.revokeTokenAndLogout();
  }

  goToMyBucket() {
    window.location.href = './things'
  }

  goToGitHub() {
    window.location.href = 'https://github.com/datacentricdesign/bucket'
  }
  goToMSTeams() {
    window.location.href = 'https://teams.microsoft.com/l/team/19%3a8e9bf40774c04e958683f95bcd96db78%40thread.tacv2/conversations?groupId=701b1040-05ca-4d33-8be5-488999981fe8&tenantId=096e524d-6929-4030-8cd3-8ab42de0887b'
  }

  loadUserProfile(): void {
    this.oauthService.loadUserProfile().then(up => (this.userProfile = up));
  }

  refresh() {
    this.oauthService.oidc = true;

    this.oauthService
      .refreshToken()
      .then(info => {})
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
