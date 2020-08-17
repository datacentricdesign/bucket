import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private router: Router, private oauthService: OAuthService) { }

  canActivate() {
    console.log("can activate?")
    if (
      this.oauthService.hasValidAccessToken() &&
      this.oauthService.hasValidIdToken()
    ) {
      console.log("yes")
      return true;
    } else {
      console.log("no")
      this.router.navigate(['/about.html', { login: true }]);
      return false;
    }
  }
}