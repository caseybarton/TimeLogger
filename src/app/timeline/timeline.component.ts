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

  private cvs: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private majorLineColor = '#00000088';
  private midLineColor = '#00000088';
  private minorLineColor = '#00000088';
  private textColor = '#000000CC';

  private majorLineThickness = 2;
  private majorLineLength = 0.35; // ratio of y dimension
  private midLineThickness = 2;
  private midLineLength = 0.29; // ratio of y dimension
  private minorLineThickness = 2;
  private minorLineLength = 0.2; // ratio of y dimension
  private font = '14px sans-serif';

  private timeRangeStart: number;
  private timeRangeEnd: number;
  private intervals: Array<Interval>;
  private canvasWidth: number;
  private canvasHeight: number;
  private pixelStart: number;
  private pixelEnd: number;

  constructor(private timelineService: TimelineService) {}

  public ngOnInit(): void {
    this.displayedStartTime = this.startTime;
    this.displayedEndTime = this.endTime;
    this.cvs = document.querySelector('canvas');
    this.ctx = this.cvs.getContext('2d');
    this.redraw();
    window.addEventListener('resize', _ => this.redraw());
    this.cvs.addEventListener('mousemove', event => this.drawCursor(event));
    this.cvs.addEventListener('mouseout', _ => this.redraw());
    console.log('timeline onInit called');
  }

  public ngOnChanges(): void {
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

  private updateInfo(): void {
    this.timeRangeStart = this.displayedStartTime;
    this.timeRangeEnd = this.displayedEndTime;
    this.intervals = this.timelineService.getIntervals(this.timeRangeStart, this.timeRangeEnd);
    const dpr: number = window.devicePixelRatio;
    const styleHeight: number = +getComputedStyle(this.cvs).getPropertyValue('height').slice(0, -2);
    const styleWidth: number = +getComputedStyle(this.cvs).getPropertyValue('width').slice(0, -2);
    this.cvs.setAttribute('height', (styleHeight * dpr).toString());
    this.cvs.setAttribute('width', (styleWidth * dpr).toString());
    this.canvasWidth = this.cvs.width;
    this.canvasHeight = this.cvs.height;
    this.pixelStart = 0;
    this.pixelEnd = this.canvasWidth;
  }

  // returns the canvas x coordinate that corresponds to a unix timestamp
  private timeToPixel(time: number): number {
    const timeRange = this.timeRangeEnd - this.timeRangeStart;
    const locationWithinRange = (time - this.timeRangeStart) / timeRange;
    return Math.floor(locationWithinRange * this.canvasWidth);
  }

  private clear(): void {
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  private drawFill(): void {
    for (const interval of this.intervals){
      this.ctx.fillStyle = interval.activity.color;
      const intervalPixelStart = this.timeToPixel(interval.startTime);
      const intervalPixelEnd = this.timeToPixel(interval.endTime ? interval.endTime : Date.now());
      this.ctx.fillRect(
        intervalPixelStart,
        0,
        Math.min(intervalPixelEnd, this.pixelEnd) === intervalPixelStart ? 1 : Math.min(intervalPixelEnd, this.pixelEnd) - intervalPixelStart,
        this.canvasHeight
      );
    }
  }

  private drawLines(): void {
    const startDate = new Date(this.timeRangeStart);
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
        this.ctx.strokeStyle = this.majorLineColor;
        this.ctx.lineWidth = this.majorLineThickness;
        lineLengthRatio = this.majorLineLength;
        hourString = hour === 0 ? '12 AM' : '12 PM';
      } else if (hour === 6 || hour === 18) {
        this.ctx.strokeStyle = this.midLineColor;
        this.ctx.lineWidth = this.midLineThickness;
        lineLengthRatio = this.midLineLength;
        hourString = hour === 6 ? '6 AM' : '6 PM';
      } else {
        this.ctx.strokeStyle = this.minorLineColor;
        this.ctx.lineWidth = this.minorLineThickness;
        lineLengthRatio = this.minorLineLength;
        hourString = hour >= 13 ? '' + (hour - 12) : '' + hour;
      }

      const startX = this.timeToPixel(hourTimestamp);
      const startY = this.canvasHeight;
      const endX = startX;
      const endY = this.canvasHeight - this.canvasHeight * lineLengthRatio;
      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(endX, endY);
      this.ctx.stroke();

      this.ctx.fillStyle = this.textColor;
      this.ctx.font = this.font;
      this.ctx.textAlign = 'center';
      this.ctx.fillText(hourString, endX, endY - 5);
    }
  }

  public redraw(): void {
    this.updateInfo();
    this.clear();
    this.drawFill();
    this.drawLines();
    console.log('timeline redrawn');
  }

  private drawCursor(event): void {
    this.redraw();
    console.log(`${event.clientX}, ${event.clientY}`);
    const canvasRect = this.cvs.getBoundingClientRect();
    const dpr = window.devicePixelRatio;
    const x = (event.clientX - canvasRect.left) * dpr;
    const y = (event.clientY - canvasRect.top) * dpr;
    this.ctx.fillStyle = '#000';
    this.ctx.fill(new Path2D(`M ${x + 19.362752},${y+10} c 1.583848,-1.688844 3.167696,-3.377689 4.751544,-5.066533 -4.550985,-4.852527 -9.101969,-9.705055 -13.652954,-14.557582 -3.236659,3.520389 -6.6195739,6.91741 -9.76069918,10.518624 -1.280988,1.980732 -0.4600491,4.633739 1.30450828,6.020299 1.7457344,1.861539 3.4914687,3.723079 5.2372031,5.584619 10.9441118,0 21.8882238,0 32.8323358,0 0,-0.833033 0,-1.666065 0,-2.499098 -6.903979,-2.19e-4 -13.807959,4.39e-4 -20.711938,-3.29e-4 z m 15.700332,-16.741035 c 1.738343,-1.778979 1.35424,-4.82414 -0.508987,-6.355738 -2.666061,-2.82331 -5.294004,-5.68423 -7.984381,-8.483549 -1.637133,-1.537028 -4.349065,-1.014233 -5.595528,0.746902 -2.951804,3.147457 -5.903609,6.294915 -8.855413,9.442373 4.550874,4.852524 9.101749,9.705047 13.652623,14.557571 3.097229,-3.30252 6.194457,-6.605039 9.291686,-9.907559 z`));
    // this.ctx.fill(new Path2D(`M ${x},${y} h 10 v 10 h -10 z`));
    // const image: SVGImageElement = document.getElementById('erase-cursor');
    // this.ctx.drawImage(image, 0, 0, 512, 512, x, y,40,40);
  }

}
