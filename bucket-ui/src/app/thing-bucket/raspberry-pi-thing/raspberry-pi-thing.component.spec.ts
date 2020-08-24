import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RaspberryPiThingComponent } from './raspberry-pi-thing.component';

describe('RaspberryPiThingComponent', () => {
  let component: RaspberryPiThingComponent;
  let fixture: ComponentFixture<RaspberryPiThingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RaspberryPiThingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RaspberryPiThingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
