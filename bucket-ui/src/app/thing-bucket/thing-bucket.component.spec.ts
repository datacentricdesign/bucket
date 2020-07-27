import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ThingBucketComponent } from './thing-bucket.component';

describe('ThingBucketComponent', () => {
  let component: ThingBucketComponent;
  let fixture: ComponentFixture<ThingBucketComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ThingBucketComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ThingBucketComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
