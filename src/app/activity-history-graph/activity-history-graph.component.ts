import {Component, ElementRef, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {Activity, TimelineService} from '../timeline.service';
import {interval, Subscription} from 'rxjs';

@Component({
  selector: 'app-activity-history-graph',
  templateUrl: './activity-history-graph.component.html',
  styleUrls: ['./activity-history-graph.component.scss']
})
export class ActivityHistoryGraphComponent implements OnInit, OnDestroy {
  @Input() activity: Activity;

  private cvs: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private redrawInterval: Subscription;

  // styling parameters
  private axisThickness = 2;
  private defaultColor = '#FFFFFF';
  private axisColor = this.defaultColor;
  private horizontalRuleColor = this.defaultColor;
  private barColor = this.defaultColor;
  private textColor = this.defaultColor;
  private font = '16px sans-serif';
  private paddingTop = 10;
  private paddingBottom = 40;
  private paddingLeft = 65;
  private paddingRight = 20;
  private barWidth = 20;
  private barMargins = 16;

  @ViewChild('canvas')
  set canvas(elementRef: ElementRef){
    console.log(elementRef.nativeElement);
    this.cvs = elementRef.nativeElement;
    this.ctx = this.cvs.getContext('2d');
    const dpr: number = window.devicePixelRatio;
    const styleWidth: number = +getComputedStyle(this.cvs).getPropertyValue('width').slice(0, -2);
    const styleHeight: number = +getComputedStyle(this.cvs).getPropertyValue('height').slice(0, -2);
    this.cvs.setAttribute('width', (styleWidth * dpr).toString());
    // this.cvs.setAttribute('height', (styleHeight * dpr).toString());
    this.cvs.setAttribute('height', (200 * dpr).toString());
    this.redraw();
    window.addEventListener('resize', _ => this.redraw());

  }

  constructor(private timelineService: TimelineService) { }

  ngOnInit(): void {
    this.redrawInterval = interval(1000).subscribe(this.redraw);
  }

  ngOnDestroy(): void {
    this.redrawInterval.unsubscribe();
  }

  redraw(): void{
    // updateInfo
    const dpr: number = window.devicePixelRatio;
    const styleWidth: number = +getComputedStyle(this.cvs).getPropertyValue('width').slice(0, -2);
    const styleHeight: number = +getComputedStyle(this.cvs).getPropertyValue('height').slice(0, -2);
    this.cvs.setAttribute('width', (styleWidth * dpr).toString());
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0);
    const currentDateTimestamp = currentDate.getTime();


    // clear
    this.ctx.clearRect(0, 0, this.cvs.width, this.cvs.height);

    // draw axis
    this.ctx.strokeStyle = this.axisColor;
    this.ctx.lineWidth = this.axisThickness;
    const axisLeft = this.axisThickness / 2 + this.paddingLeft;
    const axisRight = this.cvs.width - this.paddingRight;
    const axisBottom = this.cvs.height - this.axisThickness / 2 - this.paddingBottom;
    const axisTop = this.paddingTop;
    this.ctx.beginPath();
    this.ctx.moveTo(axisLeft, axisTop);
    this.ctx.lineTo(axisLeft, axisBottom);
    this.ctx.lineTo(axisRight, axisBottom);
    this.ctx.stroke();

    // draw bars
    const barsLeft = axisLeft + this.axisThickness / 2;
    const barsRight = axisRight;
    const barsBottom = axisBottom - this.axisThickness / 2;
    const barsTop = axisTop;

    const numBars = Math.floor((barsRight - barsLeft) / (this.barWidth + this.barMargins));
    const barQuantities: number[] = [];

    // get quantities
    let maxQuantity = 60 * 1000;
    for (let i = 0; i < numBars; i++) {
      barQuantities[i] = this.timelineService.getIntervalsSum(this.timelineService.getIntervalsOfActivity(
        this.activity,
        currentDateTimestamp - (numBars - i - 1) * 24 * 60 * 60 * 1000,
        currentDateTimestamp - (numBars - i - 2) * 24 * 60 * 60 * 1000));
      maxQuantity = barQuantities[i] > maxQuantity ? barQuantities[i] : maxQuantity;
    }

    let maxQuantityLabel;
    let halfMaxQuantityLabel;
    if (maxQuantity >= 30 * 60 * 1000){
      const maxQuantityRoundedInHours = Math.ceil(maxQuantity / (60 * 60 * 1000));
      maxQuantity = maxQuantityRoundedInHours * 60 * 60 * 1000;
      maxQuantityLabel = '' + maxQuantityRoundedInHours + '.0hr';
      halfMaxQuantityLabel = '' + Number(maxQuantityRoundedInHours / 2).toFixed(1) + 'hr';
    }else{
      const maxQuantityRoundedInMinutes = Math.ceil(maxQuantity / (60 * 1000));
      maxQuantity = maxQuantityRoundedInMinutes * 60 * 1000;
      maxQuantityLabel = '' + maxQuantityRoundedInMinutes + '.0min';
      halfMaxQuantityLabel = '' + Number(maxQuantityRoundedInMinutes / 2).toFixed(1) + 'min';
    }


    for (let i = 0; i < numBars; i++) { // going from left to right
      const barLength = barQuantities[i] / maxQuantity * (barsBottom - barsTop);
      // const barLength = 120;
      const barLeft = barsLeft + (this.barMargins + this.barWidth) * i + this.barMargins;
      const barTop = barsBottom - barLength;

      this.ctx.fillStyle = this.barColor;
      this.ctx.fillRect(barLeft, barTop, this.barWidth, barLength);

      this.ctx.fillStyle = this.textColor;
      this.ctx.font = this.font;
      this.ctx.textAlign = 'center';
      const date = new Date(currentDateTimestamp - (numBars - i - 1) * 24 * 60 * 60 * 1000);
      const label = `${date.getMonth() + 1}/${date.getDate()}`;
      const labelX = barLeft + this.barMargins / 2 + 3;
      const labelY = barsBottom + 25;
      this.ctx.translate(labelX, labelY);
      this.ctx.rotate(Math.PI * 0.3);
      this.ctx.translate(-labelX, -labelY);
      this.ctx.fillText(label, labelX, labelY);
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    // draw vertical labels
    this.ctx.beginPath();
    this.ctx.moveTo(axisLeft, axisTop);
    this.ctx.lineTo(axisLeft - 4, axisTop);
    this.ctx.moveTo(axisLeft, (axisBottom - axisTop) / 2 + axisTop);
    this.ctx.lineTo(axisLeft - 4, (axisBottom - axisTop) / 2 + axisTop);
    this.ctx.stroke();

    this.ctx.textAlign = 'right';
    this.ctx.fillText(maxQuantityLabel, axisLeft - 6, axisTop + 5);
    this.ctx.fillText(halfMaxQuantityLabel, axisLeft - 6,  (axisBottom - axisTop) / 2 + axisTop + 5);

    console.log('history graph redrawn');


  }

}
