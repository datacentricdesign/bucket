import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ThingStatsComponent } from './thing-stats.component';

describe('ThingStatsComponent', () => {
  let component: ThingStatsComponent;
  let fixture: ComponentFixture<ThingStatsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ThingStatsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ThingStatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
