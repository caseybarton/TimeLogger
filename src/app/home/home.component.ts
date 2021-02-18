import {
  Component,
  OnInit,
  isDevMode,
  OnDestroy,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import {TimelineService, Activity} from '../timeline.service';
import {interval, Subscription} from 'rxjs';
import {TimelineComponent} from '../timeline/timeline.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  public dateStr = '';
  public timelineRangeStart = 0;    // 1595721600000 1595808000000
  public timelineRangeEnd = 0;
  public redrawTimeline: () => void;
  public timelineEditMode = false;
  public timelineEditActivity: Activity = null;
  private timelineRedrawInterval: Subscription;


  @ViewChild(TimelineComponent)
  private timelineComponent: TimelineComponent;

  constructor(private timelineService: TimelineService) {}

  ngOnInit(): void {
    const startTime = new Date();
    startTime.setHours(0, 0, 0);
    this.timelineRangeStart = startTime.getTime();
    this.timelineRangeEnd = this.timelineRangeStart + 24 * 60 * 60 * 1000;
    this.timelineRedrawInterval = interval(1000).subscribe((n) => this.redrawTimeline); // this line doesnt work
    this.dateStr = new Intl.DateTimeFormat('en-US', {year: 'numeric', month: 'long', day: 'numeric'})
      .format(new Date(this.timelineRangeStart));

    // trigger change detection every frame for the timers
    function triggerChangeDetection(): void {
      window.requestAnimationFrame(triggerChangeDetection);
    }
    window.requestAnimationFrame(triggerChangeDetection);

    // setInterval(() => {console.log('activity id:0 :'); console.log(this.timelineService.getActivity(0).name), 1000});
  }

  ngAfterViewInit(): void {
    this.redrawTimeline = (event = null) => {this.timelineComponent.redraw(event); };
  }

  ngOnDestroy(): void {
    this.timelineRedrawInterval.unsubscribe();
  }

  getActivities(): Activity[] {
    return this.timelineService.getActivities();
  }

  onEraseButtonClicked(): void {
    if (this.timelineEditMode === true && this.timelineEditActivity === null) { // if already in erase mode
      this.timelineEditMode = false;
      this.timelineEditActivity = null;
    }else{
      this.timelineEditMode = true;
      this.timelineEditActivity = null;
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

  onUndoButtonClicked(): void {
    this.timelineService.undo();
    this.redrawTimeline();
  }

  onStartStopButtonClicked(activity: Activity): void {
    this.timelineService.toggleActiveActivity(activity);
    this.redrawTimeline();
  }

  onDrawButtonClicked(activity: Activity): void {
    // if already in draw mode for this activity
    if (this.timelineEditMode === true && this.timelineEditActivity === activity){
      this.timelineEditMode = false;
      this.timelineEditActivity = null;
    }else{
      this.timelineEditMode = true;
      this.timelineEditActivity = activity;
    }
  }

}

