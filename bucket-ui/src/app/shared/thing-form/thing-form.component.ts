import { Component, OnInit } from '@angular/core';
import { DTOThing, DTORaspberryPi } from '@datacentricdesign/types';
import { HttpClient } from '@angular/common/http';
import { AppService } from 'app/app.service';

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
    typeId: 'GENERIC'
  }

  raspberryPi:DTORaspberryPi = {
    netId: '',
    pass: '',
    homeSSID: '',
    homePass: '',
    eduroamSSID: 'eduroam',
    eduroamPass: ''
  }

  onSubmit() { 
    this.http.post(this.apiURL + "/things", this.model).subscribe((data: any) => {
      console.log(data)
    });
  }

  constructor(private http: HttpClient, private appService: AppService) {
    this.apiURL = this.appService.settings.apiURL;
  }

  ngOnInit(): void {
  }

}
