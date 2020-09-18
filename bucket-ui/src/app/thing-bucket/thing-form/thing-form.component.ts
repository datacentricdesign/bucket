import { Component, OnInit, ViewChild } from '@angular/core';
import { DTOThing } from '@datacentricdesign/types';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AppService } from 'app/app.service';
import { OAuthService } from 'angular-oauth2-oidc';
import { RaspberryPiThingComponent } from '../raspberry-pi-thing/raspberry-pi-thing.component';
import { ToastrService } from 'ngx-toastr';

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

  constructor(private http: HttpClient,
    private appService: AppService,
    private oauthService: OAuthService,
    private toastr: ToastrService) {
    this.apiURL = this.appService.settings.apiURL;
  }

  onSubmit() {
    if (!this.dpi.dpiGenerator) {
      return this.toast("The DPi generator is not available at the moment.", "danger", "nc-alert-circle-i")
    }

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
      body.dpi = this.dpi.getValues()
    }

    console.log(body)
    let headers = new HttpHeaders().set('Accept', 'application/json')
      .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());
    this.http.post(this.apiURL + "/things", body, { headers }).subscribe((data: any) => {
      window.location.href = './things/' + data.id;
    });
  }


  ngOnInit(): void {
  }

  toast(message: string, type: string, icon: string) {
    this.toastr.error(
      '<span data-notify="icon" class="nc-icon ' + icon + '"></span><span data-notify="message">' + message + '</span>',
      "",
      {
        timeOut: 4000,
        closeButton: true,
        enableHtml: true,
        toastClass: "alert alert-" + type + " alert-with-icon",
        positionClass: "toast-top-center"
      }
    );
  }
}
