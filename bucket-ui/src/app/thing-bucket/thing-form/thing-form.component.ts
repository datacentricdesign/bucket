import { Component, OnInit, ViewChild } from '@angular/core';
import { DTOThing, Thing } from '@datacentricdesign/types';
import { RaspberryPiThingComponent } from '../raspberry-pi-thing/raspberry-pi-thing.component';
import { ThingService } from '../services/thing.service';

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

  model: DTOThing = {
    name: 'My Test Thing',
    description: 'A Thing to test!',
    type: '',
    pem: ''
  }

  constructor(private thingService: ThingService) { }

  ngOnInit(): void {
  }

  onSubmit() {
    if (this.model.type === 'RASPBERRYPI' && !this.dpi.dpiGenerator) {
      return this.thingService.toast("The DPi generator is not available at the moment.", "danger", "nc-alert-circle-i")
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

    this.thingService.createThing(body)
      .then((data: Thing) => {
        window.location.href = './things/' + data.id;
      })
      .catch((error) => {
        this.thingService.toast(error)
      })
  }

}
