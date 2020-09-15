import { Component, OnInit, ViewChild } from '@angular/core';
import { DTOThing } from '@datacentricdesign/types';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AppService } from 'app/app.service';
import { OAuthService } from 'angular-oauth2-oidc';
import { RaspberryPiThingComponent } from '../raspberry-pi-thing/raspberry-pi-thing.component';

@Component({
  selector: 'app-thing-form',
  templateUrl: './thing-form.component.html',
  styleUrls: ['./thing-form.component.css']
})
export class ThingFormComponent implements OnInit {

  @ViewChild(RaspberryPiThingComponent) dpi: RaspberryPiThingComponent;

  types = [
    { id: 'GENERIC', name: 'Generic' },
    { id: 'RASPBERRYPI', name: 'Raspberry Pi' }
  ];

  submitted = false;

  private apiURL: string

  model: DTOThing = {
    name: 'My Test Thing',
    description: 'A Thing to test!',
    type: '',
    pem: ''
  }

  constructor(private http: HttpClient, private appService: AppService, private oauthService: OAuthService) {
    this.apiURL = this.appService.settings.apiURL;
    // this.suggestHostname()
  }

  onSubmit() {
    const button = document.getElementById("createThingButton") as HTMLButtonElement
    button.disabled = true
    const spinner = document.getElementById("spinnerCreateThing") as HTMLElement
    spinner.style.display = 'inline-block'

    const body: any = {
      name: this.model.name,
      description: this.model.description,
      type: this.model.type
    }
    if (this.model.pem !== '') {
      body.pem = this.model.pem
    }
    if (this.model.type === 'RASPBERRYPI') {
      body.dpi = {
        first_user_name: this.dpi.raspberryPi.first_user_name,
        first_user_password: this.dpi.raspberryPi.first_user_password,
        target_hostname: this.dpi.raspberryPi.target_hostname,
        enable_SSH: this.dpi.raspberryPi.enable_SSH
      }

      if (this.dpi.raspberryPi.home_ESSID !== '' && this.dpi.raspberryPi.home_password !== '') {
        body.dpi.home_ESSID = this.dpi.raspberryPi.home_ESSID;
        body.dpi.home_password = this.dpi.raspberryPi.home_password;
      }

      if (this.dpi.raspberryPi.wpa_ESSID !== '' && this.dpi.raspberryPi.wpa_password !== '' && this.dpi.raspberryPi.wpa_country !== '') {
        body.dpi.wpa_ESSID = this.dpi.raspberryPi.wpa_ESSID;
        body.dpi.wpa_password = this.dpi.raspberryPi.wpa_password;
        body.dpi.wpa_country = this.dpi.raspberryPi.wpa_country;
      }
    }

    let headers = new HttpHeaders().set('Accept', 'application/json')
      .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());
    this.http.post(this.apiURL + "/things", body, { headers }).subscribe((data: any) => {
      window.location.href = './things/' + data.id;
    });
  }


  ngOnInit(): void {
  }
}
