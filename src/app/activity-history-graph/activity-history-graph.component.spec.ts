import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityHistoryGraphComponent } from './activity-history-graph.component';

describe('ActivityHistoryGraphComponent', () => {
  let component: ActivityHistoryGraphComponent;
  let fixture: ComponentFixture<ActivityHistoryGraphComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ActivityHistoryGraphComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ActivityHistoryGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
