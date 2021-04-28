import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StravaThingComponent } from './strava-thing.component';

describe('StravaThingComponent', () => {
  let component: StravaThingComponent;
  let fixture: ComponentFixture<StravaThingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StravaThingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StravaThingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
