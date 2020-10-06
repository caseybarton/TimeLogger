import {Component, OnInit, isDevMode, OnDestroy} from '@angular/core';
import { TimelineService, Interval, Activity } from '../timeline.service';
import {interval, Subscription} from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  public activities: Activity[];
  public dateStr = '';
  public timelineRangeStart = 0;
  public timelineRangeEnd = 0;
  public redrawTimeline: () => void;
  private timelineRedrawInterval: Subscription;

  constructor(private timelineService: TimelineService) {
    this.activities = timelineService.getActivities();
  }

  ngOnInit(): void {
    const startTime = new Date();
    startTime.setHours(0, 0, 0);
    this.timelineRangeStart = startTime.getTime();
    this.timelineRangeEnd = this.timelineRangeStart + 24 * 60 * 60 * 1000;
    this.dateStr = new Intl.DateTimeFormat('en-US', {year: 'numeric', month: 'long', day: 'numeric'})
      .format(new Date(this.timelineRangeStart));

    // 1595721600000 1595808000000
    this.createTimeline();
    window.addEventListener('resize', this.redrawTimeline);
    this.timelineRedrawInterval = interval(60000).subscribe(this.redrawTimeline);


    // trigger change detection every frame for the timers
    function triggerChangeDetection(): void{window.requestAnimationFrame(triggerChangeDetection);}
    window.requestAnimationFrame(triggerChangeDetection);
  }

  ngOnDestroy(): void {
    this.timelineRedrawInterval.unsubscribe();
  }

  createTimeline(): void {


    const cvs = document.querySelector('canvas');
    const ctx = cvs.getContext('2d');
    const majorLineColor = '#00000088';
    const midLineColor = '#00000088';
    const minorLineColor = '#00000088';
    const textColor = '#000000CC';

    const majorLineThickness = 2;
    const majorLineLength = 0.35; // ratio of y dimension
    const midLineThickness = 2;
    const midLineLength = 0.29; // ratio of y dimension
    const minorLineThickness = 2;
    const minorLineLength = 0.2; // ratio of y dimension
    const font = '14px sans-serif';

    let timeRangeStart: number;
    let timeRangeEnd: number;
    let intervals: Array<Interval>;
    let canvasWidth: number;
    let canvasHeight: number;
    let pixelStart: number;
    let pixelEnd: number;



    const updateInfo = unboundUpdateInfo.bind(this);
    function unboundUpdateInfo(): void {
      timeRangeStart = this.timelineRangeStart;
      timeRangeEnd = this.timelineRangeEnd;
      intervals = this.timelineService.getIntervals(timeRangeStart, timeRangeEnd);
      const dpr: number = window.devicePixelRatio;
      const styleHeight: number = +getComputedStyle(cvs).getPropertyValue('height').slice(0, -2);
      const styleWidth: number = +getComputedStyle(cvs).getPropertyValue('width').slice(0, -2);
      cvs.setAttribute('height', (styleHeight * dpr).toString());
      cvs.setAttribute('width', (styleWidth * dpr).toString());
      canvasWidth = cvs.width;
      canvasHeight = cvs.height;
      pixelStart = 0;
      pixelEnd = canvasWidth;
    }

    // returns the canvas x coordinate that corresponds to a unix timestamp
    function timeToPixel(time: number): number {
      const pixelRange = pixelEnd - pixelStart;
      const timeRange = timeRangeEnd - timeRangeStart;
      const locationWithinRange = (time - timeRangeStart) / timeRange;
      return Math.floor(locationWithinRange * pixelRange) + pixelStart;
    }

    function clear(): void {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    }

    function drawFill(): void {
      for (const interval of intervals){
        ctx.fillStyle = interval.activity.color;
        const intervalPixelStart = timeToPixel(interval.startTime);
        const intervalPixelEnd = timeToPixel(interval.endTime ? interval.endTime : Date.now());
        ctx.fillRect(
          intervalPixelStart,
          0,
          Math.min(intervalPixelEnd, pixelEnd) === intervalPixelStart ? 1 : Math.min(intervalPixelEnd, pixelEnd) - intervalPixelStart,
          canvasHeight
        );
      }
    }


    function drawLines(): void {
      const startDate = new Date(timeRangeStart);
      let hour = startDate.getHours();
      startDate.setMinutes(0);
      startDate.setSeconds(0);
      let hourTimestamp = startDate.getTime();
      for (let i = 0; i < 23; i++) {
        hourTimestamp += 3600000;
        hour = hour === 23 ? 0 : hour + 1;
        let hourString = '';

        let lineLengthRatio = 1;
        if (hour === 0 || hour === 12) {
          ctx.strokeStyle = majorLineColor;
          ctx.lineWidth = majorLineThickness;
          lineLengthRatio = majorLineLength;
          hourString = hour === 0 ? '12 AM' : '12 PM';
        } else if (hour === 6 || hour === 18) {
          ctx.strokeStyle = midLineColor;
          ctx.lineWidth = midLineThickness;
          lineLengthRatio = midLineLength;
          hourString = hour === 6 ? '6 AM' : '6 PM';
        } else {
          ctx.strokeStyle = minorLineColor;
          ctx.lineWidth = minorLineThickness;
          lineLengthRatio = minorLineLength;
          hourString = hour >= 13 ? '' + (hour - 12) : '' + hour;
        }

        const startX = timeToPixel(hourTimestamp);
        const startY = canvasHeight;
        const endX = startX;
        const endY = canvasHeight - canvasHeight * lineLengthRatio;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        ctx.fillStyle = textColor;
        ctx.font = font;
        ctx.textAlign = 'center';
        ctx.fillText(hourString, endX, endY - 5);

      }


    }

    this.redrawTimeline = () => {
      updateInfo();
      clear();
      drawFill();
      drawLines();
      console.log('timeline redrawn');
    };

    this.redrawTimeline();
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
