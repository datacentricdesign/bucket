import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-strava-thing',
  templateUrl: './strava-thing.component.html',
  styleUrls: ['./strava-thing.component.css']
})
export class StravaThingComponent implements OnInit {

  @Input() thingId: string;
  @Input() thingName: string;

  constructor() { }

  ngOnInit(): void {
  }

  sync() {
    // trigger sync, which redirect to oauth then get the data and push into properties
  }

}
