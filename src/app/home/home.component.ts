import {Component, OnInit, isDevMode, OnDestroy, ViewChild, AfterViewInit, OnChanges} from '@angular/core';
import { TimelineService, Interval, Activity } from '../timeline.service';
import {interval, Subscription} from 'rxjs';
import {TimelineComponent} from '../timeline/timeline.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  public activities: Activity[];
  public dateStr = '';
  public timelineRangeStart = 0;    // 1595721600000 1595808000000
  public timelineRangeEnd = 0;
  public redrawTimeline: () => void;
  public timelineEditMode = false;
  public timelineEditActivity: Activity = null;
  private timelineRedrawInterval: Subscription;

  @ViewChild(TimelineComponent)
  private timelineComponent: TimelineComponent;

  constructor(private timelineService: TimelineService) {
    this.activities = timelineService.getActivities();
  }

  ngOnInit(): void {
    const startTime = new Date();
    startTime.setHours(0, 0, 0);
    this.timelineRangeStart = startTime.getTime();
    this.timelineRangeEnd = this.timelineRangeStart + 24 * 60 * 60 * 1000;
    this.timelineRedrawInterval = interval(60000).subscribe(this.redrawTimeline);
    this.dateStr = new Intl.DateTimeFormat('en-US', {year: 'numeric', month: 'long', day: 'numeric'})
      .format(new Date(this.timelineRangeStart));
    // trigger change detection every frame for the timers
    function triggerChangeDetection(): void {window.requestAnimationFrame(triggerChangeDetection); }
    window.requestAnimationFrame(triggerChangeDetection);
  }

  ngAfterViewInit(): void {
    this.redrawTimeline = this.timelineComponent.redraw;
  }

  ngOnDestroy(): void {
    this.timelineRedrawInterval.unsubscribe();
  }

  onEraseClicked(): void {
    if (this.timelineEditMode === true && this.timelineEditActivity === null) { // if already in erase mode
      this.timelineEditMode = false;
      this.timelineEditActivity = null;
    }else{
      this.timelineEditMode = true;
      this.timelineEditActivity = null;
    }
  }

  onDrawClicked(activity: Activity): void {
    // if already in draw mode for this activity
    if (this.timelineEditMode === true && this.timelineEditActivity === activity){
      this.timelineEditMode = false;
      this.timelineEditActivity = null;
    }else{
      this.timelineEditMode = true;
      this.timelineEditActivity = activity;
    }
  }

  onPrevDayButtonClicked(event): void {
    this.timelineRangeStart -= 24 * 60 * 60 * 1000;
    this.timelineRangeEnd -= 24 * 60 * 60 * 1000;
    this.dateStr = new Intl.DateTimeFormat('en-US', {year: 'numeric', month: 'long', day: 'numeric'})
      .format(new Date(this.timelineRangeStart));
  }

  onNextDayButtonClicked(event): void {
    this.timelineRangeStart += 24 * 60 * 60 * 1000;
    this.timelineRangeEnd += 24 * 60 * 60 * 1000;
    this.dateStr = new Intl.DateTimeFormat('en-US', {year: 'numeric', month: 'long', day: 'numeric'})
      .format(new Date(this.timelineRangeStart));
  }


  onStartStopButtonClicked(activity, event): void {
    this.timelineService.toggleActiveActivity(activity);
    const target = event.target.tagName === 'IMG' ? event.target : event.target.children[0];
    this.redrawTimeline();
  }

  private activityPrevTimes = new Map();
  getActivityTime(activity): number{
    const time = this.timelineService.getIntervalsSum(this.timelineService.getIntervalsOfActivity(activity));
    let ret = time;
    let prevTime;

    if (isDevMode()) {// this block exists solely to avoid an error that will be suppressed in production
      if (this.activityPrevTimes.has(activity)) {
        prevTime = this.activityPrevTimes.get(activity);
        if (time - prevTime < 10) {
          ret = prevTime;
        } else {
          ret = time;
          this.activityPrevTimes.set(activity, time);
        }
      } else {
        this.activityPrevTimes.set(activity, time);
      }
    }
    return ret;
  }
}
