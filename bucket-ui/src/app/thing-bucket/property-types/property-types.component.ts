import { Component, OnInit, ViewChild } from '@angular/core';
import { ThingService } from '../services/thing.service';
import { Dimension, PropertyType } from '@datacentricdesign/types';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
  selector: 'app-property-types',
  templateUrl: './property-types.component.html'
})
export class PropertyTypesComponent implements OnInit {

  types$: Observable<PropertyType[]>;
  types: PropertyType[] = []

  dimensionTypes = ['string', 'number', 'boolean', 'audio/mpeg', 'image/jpeg', 'video/mp4', 'application/octet-stream'];

  model: PropertyType = {
    id: 'EXAMPLE_PROPERTY_TYPE',
    name: 'Example Property Type',
    description: 'Just an example of property type.',
    dimensions: [],
  }

  modelDimension = {
    id: 'example-dimension',
    name: 'Example Dimension',
    description: 'Just an example of dimension.',
    unit: '',
    type: '',
    labels: []
  }

  constructor(private thingService: ThingService) {

  }

  async ngOnInit() {
    this.types$ = this.thingService.getPropertyTypes().pipe(
      map((data: PropertyType[]) => {
        this.types = data
        return this.types;
      }), catchError(error => {
        return throwError('Types not found!');
      })
    )
  }

  onSubmit() {
    this.thingService.createPropertyType(this.model)
      .then((data) => {
        window.location.reload();
      })
      .catch((error) => {
        this.thingService.toast(error)
      })
  }

  addDimension() {
    this.model.dimensions.push(Object.assign({}, this.modelDimension));
  }

  removeDimension(index) {
    this.model.dimensions.splice(index, 1);
  }
}
