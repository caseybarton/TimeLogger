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
  public activeInterval: Interval = null;

  constructor() {
    this.activities = [];
    this.intervalsMap = new BinMap();
    this.syncWithServer();
  }

  syncWithServer(): void {
    const exampleData = '[[1595716600000,{"startTime":1595716600000,"endTime":1595721600000,"activity":{"name":"running","color":"pink"}}],[1595726600000,{"startTime":1595726600000,"endTime":1595731600000,"activity":{"name":"running","color":"pink"}}],[1595731600000,{"startTime":1595731600000,"endTime":1595735600000,"activity":{"name":"swimming","color":"orange"}}],[1595807000000,{"startTime":1595807000000,"endTime":1595817000000,"activity":{"name":"sleeping","color":"grey"}}]]';
    this.importJson(exampleData);
  }

  exportJson(): string {
    const intervalsArray = Array.from(this.intervalsMap.between({}));
    return JSON.stringify(intervalsArray);
  }

  importJson(json: string): void {
    const intervals = JSON.parse(json);
    const newIntervalsMap = new BinMap<number, Interval>();
    const newActivities: Activity[] = [];
    let activeInterval: Interval = null;
    for (const kv of intervals) {
      const key: number = kv[0];
      const interval: Interval = kv[1];
      if (!newActivities.find(activity => activity.name === interval.activity.name)){
        newActivities.push(interval.activity);
      }
      if (!interval.endTime) {// active interval is separate from intervals list
        console.assert(!activeInterval, `ERROR: Multiple active intervals read from input! Previous interval: ${activeInterval}, New interval: ${interval}`);
        this.activeInterval = activeInterval = interval;
      }else{
        newIntervalsMap.set(key, interval);
      }
    }
    this.intervalsMap = newIntervalsMap;
    this.activities = newActivities;
    console.log(`new intervals map = ${this.exportJson()}`);
  }

  toggleActiveActivity(activity: Activity): void {
    console.assert(!!this.activities.find(e => e === activity), `ERROR: activity not found in toggleActiveActivity(): ${activity}`);

    if (this.activeInterval) {
      this.activeInterval.endTime = Date.now();
      this.intervalsMap.set(this.activeInterval.startTime, this.activeInterval);
    }

    if (this.activeInterval && this.activeInterval.activity === activity) {
      // toggle active
      this.activeInterval = null;
    } else {
      // new active activity
      this.activeInterval = {startTime: Date.now(), endTime: null, activity};
    }
  }

  getActiveActivity(): Activity {
    return !!this.activeInterval && this.activeInterval.activity;
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
      if (interval.activity === activity) {
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


  eraseIntervals(intervalStart: number, intervalEnd: number): void {
    console.log(`erase interval: ${intervalStart},${intervalEnd}`);
  }

  addInterval(activity: Activity, intervalStart: number, intervalEnd: number): void {
    console.log(`add interval: ${activity.name},${intervalStart},${intervalEnd}`);
  }

}

export interface Activity {
  name: string;
  color: string;
}

export interface Interval {
  startTime: number;
  endTime: number;
  activity: Activity;
}
