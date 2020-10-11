import {Component, Input, OnChanges, OnInit} from '@angular/core';
import {Interval, TimelineService} from '../timeline.service';

@Component({
  selector: 'app-timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss']
})
export class TimelineComponent implements OnInit, OnChanges {
  @Input() startTime: number;
  @Input() endTime: number;
  private displayedStartTime: number;
  private displayedEndTime: number;
  private transitionAnimationDuration = 500;
  private currentlyAnimating = false;
  private canvas: HTMLCanvasElement;


  public redraw: () => void;

  constructor(private timelineService: TimelineService) {}

  ngOnInit(): void {
    this.displayedStartTime = this.startTime;
    this.displayedEndTime = this.endTime;
    this.canvas = document.querySelector('canvas');
    this.createTimeline();
    window.addEventListener('resize', this.redraw);
    canvas.addEventListener('mousemove', this.drawCursor(event));
    console.log('timeline onInit called');
  }

  ngOnChanges(): void {
    // animate the transition to the new displayed time
    const prevLeftBound = this.displayedStartTime;
    const prevRightBound = this.displayedEndTime;
    const newLeftBound = this.startTime;
    const newRightBound = this.endTime;
    const animationStartTime = Date.now();
    const animationEndTime = animationStartTime + this.transitionAnimationDuration;
    const nextAnimationFrame = unBoundNextAnimationFrame.bind(this);
    this.currentlyAnimating = true;
    function unBoundNextAnimationFrame(): void {
      const currentTime = Date.now();
      const leftBoundDifference = newLeftBound - prevLeftBound;
      const rightBoundDifference = newRightBound - prevRightBound;
      const progressRatio = (currentTime - animationStartTime) / (animationEndTime - animationStartTime);
      function easeInOutQuad(x: number): number {
        return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;

      }
      this.displayedStartTime = leftBoundDifference * easeInOutQuad(progressRatio) + prevLeftBound;
      this.displayedEndTime = rightBoundDifference * easeInOutQuad(progressRatio) + prevRightBound;

      if (currentTime >= animationEndTime){
        this.displayedStartTime = this.startTime;
        this.displayedEndTime = this.endTime;
        this.currentlyAnimating = false;
      }else{
        window.requestAnimationFrame(nextAnimationFrame);
      }

      this.redraw();
    }
    window.requestAnimationFrame(nextAnimationFrame);
  }

  createTimeline(): void {
    const cvs = this.canvas;
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
      timeRangeStart = this.displayedStartTime;
      timeRangeEnd = this.displayedEndTime;
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

    const drawLines = unboundDrawLines.bind(this);
    function unboundDrawLines(): void {
      const startDate = new Date(timeRangeStart);
      let hour = startDate.getHours();
      startDate.setMinutes(0);
      startDate.setSeconds(0);
      let hourTimestamp = startDate.getTime();
      const numLinesToDraw = this.currentlyAnimating ? 24 : 23;
      for (let i = 0; i < numLinesToDraw; i++) {
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


    this.redraw = () => {
      updateInfo();
      clear();
      drawFill();
      drawLines();
      console.log('timeline redrawn');
    };

    this.redraw();
  }

  function drawCursor(event): void {
    let canvasRect = this.canvas.getBoundingClientRect();
    const x = event.clientX - canvasRect.left;
    const y = event.clientY - canvasRect.top;
    // ctx.fillRect(x, y, 20, 20);
  }

}
