import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { LottieModule } from 'ngx-lottie';
import player from 'lottie-web';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { TimePipe } from './time.pipe';
import { TimelineComponent } from './timeline/timeline.component';
import {FormsModule} from '@angular/forms';

export function playerFactory(): any {
  return player;
}

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    TimePipe,
    TimelineComponent
  ],
    imports: [
        BrowserModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        LottieModule.forRoot({player: playerFactory}),
        FormsModule
    ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
