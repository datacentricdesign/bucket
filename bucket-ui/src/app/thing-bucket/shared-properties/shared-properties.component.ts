import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { OAuthService } from 'angular-oauth2-oidc';
import { Title } from '@angular/platform-browser';
import { AppService } from 'app/app.service';
import { ThingService } from '../services/thing.service';
import { Property } from '@datacentricdesign/types';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Period } from '../shared-properties-stats/shared-properties-stats.component'

@Component({
  selector: 'shared-properties',
  templateUrl: './shared-properties.component.html'
})
export class SharedPropertiesComponent implements OnInit {

  private selectedPeriod: Period;

  properties: Property[] = []

  constructor(private thingService: ThingService) {
  }

  ngOnInit() {
    
  }

  async changePeriodHandler($event: Period) {
    this.selectedPeriod = $event
    this.properties = await this.thingService.sharedProperties('*', this.selectedPeriod.duration, this.selectedPeriod.interval)
  }

}
