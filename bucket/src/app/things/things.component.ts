import { Component, OnInit } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable, throwError } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

import { map, catchError } from 'rxjs/operators';

import * as moment from 'moment';

interface Thing {
  id: string;
  name: string;
  last_update: number;
  lastUpdateText: string;
  controls: string[];
  controls_formated: string[];
}

@Component({
  selector: 'things-cmp',
  templateUrl: './things.component.html',
  styleUrls: ['./things.component.css']
})
export class ThingsComponent implements OnInit {
  things$: Observable<Thing[]>;
  test$: Observable<Thing[]>;
  things: Thing[]
  // myWebSocket: WebSocketSubject<Thing> = webSocket('ws://localhost:5000');

  constructor(private http: HttpClient) { }

  ngOnInit(): void {

    // this.myWebSocket.subscribe(
    //   msg => console.log('message received: ' + msg),
    //   // Called whenever there is a message from the server    
    //   err => console.log(err),
    //   // Called if WebSocket API signals some kind of error    
    //   () => console.log('complete')
    //   // Called when connection is closed (for whatever reason)  
    // );

    // this.things$ = this.http
    //   .get<Thing[]>("http://localhost:5000/things").pipe(
    //     map((data: Thing[]) => {
    //       this.things = data
    //       for (let index = 0; index < data.length; index++) {
    //         data[index].controls_formated = []
    //         for (let indexc = 0; indexc < data[index].controls.length; indexc++) {
    //           data[index].controls_formated.push(data[index].controls[indexc].toUpperCase().replace("_", " "))
    //         }
    //         data[index].lastUpdateText = moment(data[index].last_update * 1000).fromNow()
    //       }
    //       return data;
    //     }), catchError(error => {
    //       return throwError('Thing not found!');
    //     })
    //   )
  }

  fireControl(thingIndex, controlIndex): void {
    this.http.get("http://localhost:5000/things/" + this.things[thingIndex].id + "/controls/" + this.things[thingIndex].controls[controlIndex]).subscribe((data: any) => {
      console.log(data)
    });
  }

}