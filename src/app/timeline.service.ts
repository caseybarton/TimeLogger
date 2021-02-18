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
  private restorePoints: { activities: Activity[], intervals: Interval[]}[];

  constructor() {
    this.activities = [];
    this.intervalsMap = new BinMap();
    this.syncWithServer();
  }

  syncWithServer(): void {
    const exampleData = '{' +
      '"activities":[{"id":0,"name":"running","color":"#FF0000AA"},{"id":1,"name":"swimming","color":"#FFAA00AA"},{"id":2,"name":"sleeping","color":"#444444AA"}],' +
      '"intervals":[{"startTime":1595716600000,"endTime":1595721600000,"activityId":0},{"startTime":1595731600000,"endTime":1595735600000,"activityId":1}],' +
      '"activeInterval":null, ' +
      '"restorePoints":[]}';
    this.importJson(exampleData);
  }

  exportJson(): string {
    const intervalsMap = Array.from(this.intervalsMap.between({}));
    const intervalsArray = [];
    for (const interval of intervalsMap) {
      intervalsArray.push(interval);
    }
    return JSON.stringify({
      activities: this.activities,
      intervals: intervalsArray,
      activeInterval: this.activeInterval,
      restorePoints: this.restorePoints
    });
  }

  importJson(json: string): void {
    const parsedJson = JSON.parse(json);
    this.activities = parsedJson.activities;
    const intervals: Interval[] = parsedJson.intervals;
    this.activeInterval = parsedJson.activeInterval;
    this.restorePoints = parsedJson.restorePoints;
    const newIntervalsMap = new BinMap<number, Interval>();
    for (const interval of intervals) {
      newIntervalsMap.set(interval.startTime, interval);
    }
    this.intervalsMap = newIntervalsMap;
    // console.log(`new intervals map:`);
    // console.log(this.exportJson());
  }

  toggleActiveActivity(activity: Activity): void {
    console.assert(!!this.activities.find(e => e === activity), `ERROR: activity not found in toggleActiveActivity(): ${activity}`);

    // add the current interval
    if (this.activeInterval) {
      this.activeInterval.endTime = Date.now();
      this.addInterval(this.activeInterval);
    }

    // switch or disable it
    if (this.activeInterval && this.activeInterval.activityId === activity.id) {
      // toggle active
      this.activeInterval = null;
    } else {
      // new active activity
      this.activeInterval = {startTime: Date.now(), endTime: null, activityId: activity.id};
    }
  }

  getActiveActivity(): Activity {
    if (this.activeInterval) {
      return this.activities.find(e => e.id === this.activeInterval.activityId);
    }
    return null;
  }

  /**
   * Returns an array of the subset of intervals that start between lowerBound and upperBound sorted by startTime.
   * If no parameters are given, returns all intervals.
   */
  getIntervals(lowerBound: number = null, upperBound: number = null, includeActiveInterval: boolean = true): Array<Interval> {
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
      && includeActiveInterval
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
      if (interval.activityId === activity.id) {
        ret.push(interval);
      }
    }
    return ret;
  }

  /**
   * Returns the total time of all intervals in an array.
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

  getActivity(id: number): Activity {
    const activity = this.activities.find(e => e.id === id);
    console.assert(!!activity, `ERROR: activity id:${id} not found!`);
    return activity;
  }

  eraseIntervals(from: number, to: number, createRestorePoint: boolean = true): void {
    // console.log('intervals before erase:');
    // console.log(this.getIntervals());
    // console.log(`erasing intervals between: ${new Date(from).toUTCString()},${new Date(to).toUTCString()}`);
    const intervals = this.getIntervals();
    if (createRestorePoint) {this.createRestorePoint(); }
    for (const interval of intervals) {
      // five possibilities:
      // no overlap
      if (interval.startTime >= to || interval.endTime <= from) {
        // console.log(`erase case 1`);
        continue;
      }
      // envelopes the interval
      if (from <= interval.startTime && interval.endTime <= to) {
        // console.log(`erase case 2`);
        // console.log(`erase interval: ${new Date(interval.startTime).toUTCString()},${new Date(interval.endTime).toUTCString()}`);
        this.intervalsMap.delete(interval.startTime);
      }
      // cuts through the middle of the interval
      if ((interval.startTime < from && from < interval.endTime) && (interval.startTime < to && to < interval.endTime)) {
        // console.log(`erase case 3`);
        // console.log(`erase interval: ${new Date(interval.startTime).toUTCString()},${new Date(interval.endTime).toUTCString()}`);
        this.intervalsMap.delete(interval.startTime);
        const leftNewInterval: Interval = {
          startTime: interval.startTime,
          endTime: from,
          activityId: interval.activityId
        };
        const rightNewInterval: Interval = {
          startTime: to,
          endTime: interval.endTime,
          activityId: interval.activityId
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
          activityId: interval.activityId
        };
        this.intervalsMap.set(newInterval.startTime, newInterval);
      }
      // overlaps the end of the interval
      if ((interval.startTime < from && from < interval.endTime) && (interval.endTime <= to)) {
        // console.log(`erase case 5`);
        this.intervalsMap.delete(interval.startTime);
        const newInterval: Interval = {
          startTime: interval.startTime,
          endTime: from,
          activityId: interval.activityId
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

    this.createRestorePoint();

    // Two intervals can't have the same start time, so lets just keep them mutually exclusive
    this.eraseIntervals(interval.startTime, interval.endTime, false);

    this.intervalsMap.set(interval.startTime, interval);
    // console.log(`add interval: ${interval.activity.name},${new Date(interval.startTime).toUTCString()},${new Date(interval.endTime).toUTCString()}`);
    // console.log('intervals after addition:');
    // console.log(this.getIntervals());
  }

  createRestorePoint(): void {
    if (this.restorePoints.length >= 10){
      this.restorePoints.shift();
    }
    // console.log('restore points before push:');
    // console.log(this.restorePoints);
    // console.log('creating restore point:');
    // console.log({
    //   activities: this.activities,
    //   intervals: this.getIntervals(null, null, false)
    // });
    this.restorePoints.push({
      activities: this.activities,
      intervals: this.getIntervals(null, null, false)
    });
    // console.log('restore points after push:');
    // console.log(this.restorePoints);
  }

  undo(): void {
    // console.log('restore points before undo:');
    // console.log(this.restorePoints);
    if (this.restorePoints.length === 0){
      return;
    }
    const newState = this.restorePoints.pop();
    console.log('newState:');
    console.log(newState);
    console.log('before undo:');
    console.log(this.activities);
    console.log(this.getIntervals());
    this.activities = newState.activities;
    const newIntervalsMap = new BinMap<number, Interval>();
    for (const interval of newState.intervals) {
      newIntervalsMap.set(interval.startTime, interval);
    }
    this.intervalsMap = newIntervalsMap;
    console.log('after undo:');
    console.log(this.activities);
    console.log(this.getIntervals());
  }

}


export interface Activity {
  id: number;
  name: string;
  color: string;
}

export interface Interval {
  startTime: number;
  endTime: number;
  activityId: number;
}
