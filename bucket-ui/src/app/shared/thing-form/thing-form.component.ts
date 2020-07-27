import { Component, OnInit } from '@angular/core';
import { DTOThing, DTORaspberryPi } from '../../../../../bucket-api/types';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-thing-form',
  templateUrl: './thing-form.component.html',
  styleUrls: ['./thing-form.component.css']
})
export class ThingFormComponent implements OnInit {

  types = ['GENERIC', 'RASPBERRYPI'];

  submitted = false;

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
    this.http.post("http://localhost:8080/things", this.model).subscribe((data: any) => {
      console.log(data)
    });
  }

  // TODO: Remove this when we're done
  get diagnostic() { return JSON.stringify(this.model); }

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
  }

}
