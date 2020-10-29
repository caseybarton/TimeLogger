import { Injectable } from '@angular/core';
import BinMap, {IteratorType} from 'binmap';

/**
 * Stores and retrieves the user's activity history
 */
@Injectable({
  providedIn: 'root'
})
export class TimelineService {
  private activities: Activity[];
  private intervalsMap: BinMap<number, Interval>;
  private activeInterval: Interval = null;
  private restorePoints: {activities: Activity[], intervalsMap: BinMap<number, Interval>, activeInterval: Interval}[];
  private currentRestorePoint: number;

  constructor() {
    this.activities = [];
    this.intervalsMap = new BinMap();
    this.syncWithServer();
  }

  syncWithServer(): void {
    const exampleData = '{"activities":[{"name":"running","color":"#FF0000AA"},{"name":"swimming","color":"#FFAA00AA"},{"name":"sleeping","color":"#444444AA"}],' +
      '"intervals":[{"startTime":1595716600000,"endTime":1595721600000,"activityName":"running"},{"startTime":1595731600000,"endTime":1595735600000,"activityName":"swimming"}],' +
      '"activeInterval":null}';
    this.importJson(exampleData);
  }

  getActivityColor(activityName: string): string {
    const activity = this.activities.find(e => e.name === activityName);
    console.assert(!!activity, `ERROR: activity ${activityName} not found!`);
    return activity.color;
  }

  exportJson(): string {
    const intervalsMap = Array.from(this.intervalsMap.between({}));
    const intervalsArray = [];
    for (const interval of intervalsMap){
      intervalsArray.push(interval);
    }
    return JSON.stringify({activities: this.activities, intervals: intervalsArray, activeInterval: this.activeInterval});
  }

  importJson(json: string): void {
    const parsedJson = JSON.parse(json);
    this.activities = parsedJson.activities;
    const intervals: Interval[] = parsedJson.intervals;
    this.activeInterval = parsedJson.activeInterval;
    const newIntervalsMap = new BinMap<number, Interval>();
    for (const interval of intervals) {
      newIntervalsMap.set(interval.startTime, interval);
    }
    this.intervalsMap = newIntervalsMap;
    console.log(`new intervals map:`);
    console.log(this.exportJson());
  }

  toggleActiveActivity(activity: Activity): void {
    console.assert(!!this.activities.find(e => e === activity), `ERROR: activity not found in toggleActiveActivity(): ${activity}`);

    // add the current interval
    if (this.activeInterval) {
      this.activeInterval.endTime = Date.now();
      this.addInterval(this.activeInterval);
    }

    // switch or disable it
    if (this.activeInterval && this.activeInterval.activityName === activity.name) {
      // toggle active
      this.activeInterval = null;
    } else {
      // new active activity
      this.activeInterval = {startTime: Date.now(), endTime: null, activityName: activity.name};
    }
  }

  getActiveActivity(): Activity {
    if (this.activeInterval){
      return this.activities.find(e => e.name === this.activeInterval.activityName);
    }
    return null;
  }

  /**
   * Returns an array of the subset of intervals that start between lowerBound and upperBound sorted by startTime.
   * If no parameters are given, returns all intervals.
   */
  getIntervals(lowerBound?: number, upperBound?: number): Array<Interval> {
    const ret: Interval[] = [];
    const intervalsMap = (arguments[0] && arguments[1])
      ? Array.from(this.intervalsMap.between({ge: lowerBound, lt: upperBound}))
      : arguments[0]
        ? Array.from(this.intervalsMap.between({ge: lowerBound}))
        : Array.from(this.intervalsMap.between({}));
    for (const kv of intervalsMap) {
      ret.push(kv[1]);
    }
    if (this.activeInterval
      && !(arguments[0] && this.activeInterval.startTime < lowerBound)
      && !(arguments[1] && this.activeInterval.startTime >= upperBound)
    ) {
      ret.push(this.activeInterval);
    }
    return ret;
  }

  /**
   * Returns an array of the subset of intervals of a specific activity that start between lowerBound and upperBound sorted by startTime.
   * If no parameters are given, returns all intervals of the activity.
   */
  getIntervalsOfActivity(activity: Activity, lowerBound?: number, upperBound?: number): Array<Interval> {
    const ret: Interval[] = [];
    const intervals = this.getIntervals(lowerBound, upperBound);
    for (const interval of intervals) {
      if (interval.activityName === activity.name) {
        ret.push(interval);
      }
    }
    return ret;
  }

  /**
   * Returns the total time of all intervals in an array. Includes the current active interval.
   */
  getIntervalsSum(intervals: Array<Interval>): number {
    let sum = 0;
    for (const interval of intervals) {
      sum += (interval.endTime ? interval.endTime : Date.now()) - interval.startTime;
    }
    return sum;
  }

  getActivities(): Array<Activity> {
    return this.activities;
  }

  eraseIntervals(from: number, to: number): void {
    // console.log('intervals before erase:');
    // console.log(this.getIntervals());
    // console.log(`erasing intervals between: ${new Date(from).toUTCString()},${new Date(to).toUTCString()}`);
    const intervals = this.getIntervals();
    for (const interval of intervals){
      // five possibilities:
      // no overlap
      if (interval.startTime >= to || interval.endTime <= from){
        // console.log(`erase case 1`);
        continue;
      }
      // envelopes the interval
      if (from <= interval.startTime && interval.endTime <= to){
        // console.log(`erase case 2`);
        // console.log(`erase interval: ${new Date(interval.startTime).toUTCString()},${new Date(interval.endTime).toUTCString()}`);
        this.intervalsMap.delete(interval.startTime);
      }
      // cuts through the middle of the interval
      if ((interval.startTime < from && from < interval.endTime) && (interval.startTime < to && to < interval.endTime)){
        // console.log(`erase case 3`);
        // console.log(`erase interval: ${new Date(interval.startTime).toUTCString()},${new Date(interval.endTime).toUTCString()}`);
        this.intervalsMap.delete(interval.startTime);
        const leftNewInterval: Interval = {
          startTime: interval.startTime,
          endTime: from,
          activityName: interval.activityName
        };
        const rightNewInterval: Interval = {
          startTime: to,
          endTime: interval.endTime,
          activityName: interval.activityName
        };
        this.intervalsMap.set(leftNewInterval.startTime, leftNewInterval);
        this.intervalsMap.set(rightNewInterval.startTime, rightNewInterval);
      }
      // overlaps the start of the interval
      if ((from <= interval.startTime) && (interval.startTime < to && to < interval.endTime)) {
        // console.log(`erase case 4`);
        this.intervalsMap.delete(interval.startTime);
        const newInterval: Interval = {
          startTime: to,
          endTime: interval.endTime,
          activityName: interval.activityName
        };
        this.intervalsMap.set(newInterval.startTime, newInterval);
      }
      // overlaps the end of the interval
      if ((interval.startTime < from && from < interval.endTime) && (interval.endTime <= to)){
        // console.log(`erase case 5`);
        this.intervalsMap.delete(interval.startTime);
        const newInterval: Interval = {
          startTime: interval.startTime,
          endTime: from,
          activityName: interval.activityName
        };
        this.intervalsMap.set(newInterval.startTime, newInterval);
      }
    }
    // console.log('intervals after erase:');
    // console.log(this.getIntervals());
  }

  addInterval(interval: Interval): void {
    // console.log('intervals before addition:');
    // console.log(this.getIntervals());

    // Two intervals can't have the same start time, so lets just keep them mutually exclusive
    this.eraseIntervals(interval.startTime, interval.endTime);

    this.intervalsMap.set(interval.startTime, interval);
    // console.log(`add interval: ${interval.activity.name},${new Date(interval.startTime).toUTCString()},${new Date(interval.endTime).toUTCString()}`);
    // console.log('intervals after addition:');
    // console.log(this.getIntervals());
  }

  createRestorePoint(){

  }

  undo(){

  }

  redo(){

  }

}

export interface Activity {
  name: string;
  color: string;
}

export interface Interval {
  startTime: number;
  endTime: number;
  activityName: string;
}
