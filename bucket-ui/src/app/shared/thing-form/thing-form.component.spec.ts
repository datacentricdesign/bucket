import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ThingFormComponent } from './thing-form.component';

describe('ThingFormComponent', () => {
  let component: ThingFormComponent;
  let fixture: ComponentFixture<ThingFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ThingFormComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ThingFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
