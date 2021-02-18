import {Component, isDevMode, OnInit, Output, EventEmitter, Input} from '@angular/core';
import {TimelineService, Interval, Activity} from '../timeline.service';
import {animate, state, style, transition, trigger} from '@angular/animations';

@Component({
  selector: 'app-activity-widget',
  templateUrl: './activity-widget.component.html',
  styleUrls: ['./activity-widget.component.scss'],
  animations: [
    trigger('openCloseOptions', [
      state('open', style({
        height: '120px'
      })),
      state('closed', style({
        height: '0px'
      })),
      transition('open => closed', [
        animate('0.25s cubic-bezier(0.65, 0, 0.35, 1)')
      ]),
      transition('closed => open', [
        animate('0.25s cubic-bezier(0.65, 0, 0.35, 1)')
      ])
    ]),
    trigger('openCloseHistory', [
      state('open', style({
        height: '200px'
      })),
      state('closed', style({
        height: '0px'
      })),
      transition('open => closed', [
        animate('0.25s cubic-bezier(0.65, 0, 0.35, 1)')
      ]),
      transition('closed => open', [
        animate('0.25s cubic-bezier(0.65, 0, 0.35, 1)')
      ])
    ])
  ]
})
export class ActivityWidgetComponent implements OnInit {
  @Input() activity: Activity;
  @Output() startStopButtonClickedEvent = new EventEmitter<Activity>();
  @Output() drawButtonClickedEvent = new EventEmitter<Activity>();

  historyIsOpen = false;
  optionsIsOpen = false;

  constructor(public timelineService: TimelineService) { }

  ngOnInit(): void {
  }

  startStopButtonClicked(): void {
    this.startStopButtonClickedEvent.emit(this.activity);
  }

  drawButtonClicked(): void {
    this.drawButtonClickedEvent.emit(this.activity);
  }

  historyButtonClicked(): void {
    this.historyIsOpen = !this.historyIsOpen;
    this.optionsIsOpen = false;
  }

  optionsButtonClicked(): void {
    this.optionsIsOpen = !this.optionsIsOpen;
    this.historyIsOpen = false;
  }

  private activityPrevTimes = new Map(); // see *
  getActivityTime(activity): number{
    // window.myLog = this.timelineService.getIntervalsOfActivity(activity);
    const time = this.timelineService.getIntervalsSum(this.timelineService.getIntervalsOfActivity(activity));
    let ret = time;
    let prevTime;

    if (isDevMode()) {// *this block exists solely to avoid an error that will be suppressed in production
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
