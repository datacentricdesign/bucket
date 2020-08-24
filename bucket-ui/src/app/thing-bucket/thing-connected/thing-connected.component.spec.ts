import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ThingConnectedComponent } from './thing-connected.component';

describe('ThingConnectedComponent', () => {
  let component: ThingConnectedComponent;
  let fixture: ComponentFixture<ThingConnectedComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ThingConnectedComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ThingConnectedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
