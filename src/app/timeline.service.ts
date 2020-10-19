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
    const input = [
      {
        name: 'running',
        color: 'pink',
        intervals: [
          {
            startTime: 1595726600000,
            endTime: 1595731600000
          },
          {
            startTime: 1595716600000,
            endTime: 1595721600000
          }
        ]
      },
      {
        name: 'swimming',
        color: 'orange',
        intervals: [
          {
            startTime: 1595731600000,
            endTime: 1595735600000
          }
        ]
      },
      {
        name: 'sleeping',
        color: 'grey',
        intervals: [
          {
            startTime: 1595807000000,
            endTime: 1595817000000
          }
        ]
      }
    ];

    // sort intervals into a sorted map for efficient retrieval
    for (const i of input){
      const activity = {name: i.name, color: i.color};
      let activeInterval: any;
      this.activities.push(activity);
      for (const j of i.intervals){
        if (!j.endTime) { // active interval is separate from intervals list
          console.assert(!activeInterval, `ERROR: Multiple active intervals read from input! Previous interval: ${activeInterval}, New interval: ${j}`);
          this.activeInterval = {startTime: j.startTime, endTime: null, activity};
          activeInterval = j;
        } else {
          this.intervalsMap.set(
            j.startTime,
            {startTime: j.startTime, endTime: j.endTime, activity}
          );
        }
      }
    }
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
