import { Component, OnInit } from '@angular/core';
import { DTOThing, DTORaspberryPi } from '@datacentricdesign/types';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AppService } from 'app/app.service';
import { OAuthService } from 'angular-oauth2-oidc';

@Component({
  selector: 'app-thing-form',
  templateUrl: './thing-form.component.html',
  styleUrls: ['./thing-form.component.css']
})
export class ThingFormComponent implements OnInit {

  types = ['GENERIC', 'RASPBERRYPI'];

  submitted = false;

  private apiURL: string

  model:DTOThing = {
    name: 'My Test Thing',
    description: 'A Thing to test!',
    type: 'GENERIC',
    pem: ''
  }

  raspberryPi:DTORaspberryPi = {
    netId: '',
    pass: '',
    homeSSID: '',
    homePass: '',
    eduroamSSID: 'eduroam',
    eduroamPass: ''
  }

  constructor(private http: HttpClient, private appService: AppService, private oauthService: OAuthService) {
    this.apiURL = this.appService.settings.apiURL;
  }

  onSubmit() { 
    let headers = new HttpHeaders().set('Accept', 'application/json')
    .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());
    this.http.post(this.apiURL + "/things", this.model, {headers}).subscribe((data: any) => {
      window.location.href = './things/' + data.id;
    });
  }


  ngOnInit(): void {
  }

}
