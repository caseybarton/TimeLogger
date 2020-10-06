import { Component, NgZone } from '@angular/core';
import {
  trigger,
  state,
  style,
  animate,
  transition,
} from '@angular/animations';
import { AnimationItem } from 'lottie-web';
import { AnimationOptions } from 'ngx-lottie';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [
    trigger('openCloseNav', [
      state('open', style({
        left: '0px'
      })),
      state('closed', style({
        left: '-300px'
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
export class AppComponent {
  title = 'TimeLogger';
  isOpen = false;

  private animationItem: AnimationItem;
  drawerButtonAnimationOptions: AnimationOptions = {
    path: '/assets/menu-icon-white.json',
    loop: false,
    autoplay: false
  };

  constructor(private ngZone: NgZone) {}


  toggleDrawer(): void{
    this.isOpen = !this.isOpen;
    if (this.isOpen){
      this.ngZone.runOutsideAngular(() => this.animationItem.playSegments([0, 15], true));
    }else{
      this.ngZone.runOutsideAngular(() => this.animationItem.playSegments([16, 0], true));
    }
  }

  drawerButtonAnimationCreated(animationItem: AnimationItem): void{
    this.animationItem = animationItem;
  }

}
