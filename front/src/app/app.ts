import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Graph } from "./graph/graph";

@Component({
  selector: 'app-root',
  imports: [Graph],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
calculate($event: any) {
  console.log($event);
  ;
}
  protected readonly title = signal('front');
}
