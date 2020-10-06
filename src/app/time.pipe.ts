import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'time'
})
export class TimePipe implements PipeTransform {

  transform(value: number, ...args: unknown[]): unknown {
    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    let centiseconds = 0;

    hours = Math.floor(value / 3600000);
    value = value % 3600000;
    minutes = Math.floor(value / 60000);
    value = value % 60000;
    seconds = Math.floor(value / 1000);
    value = value % 1000;
    centiseconds = Math.floor(value / 10);

    const hoursStr = hours === 0
      ? ''
      : `${hours}:`;
    const minutesStr = minutes < 10
      ? `0${minutes}:`
      : `${minutes}:`;
    const secondsStr = seconds < 10
      ? `0${seconds}.`
      : `${seconds}.`;
    const centisecondsStr = centiseconds < 10
      ? `0${centiseconds}`
      : `${centiseconds}`;

    return hoursStr + minutesStr + secondsStr + centisecondsStr;
  }

}
