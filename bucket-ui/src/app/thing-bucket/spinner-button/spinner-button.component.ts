import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';

@Component({
  moduleId: module.id,
  selector: 'app-spinner-button',
  templateUrl: './spinner-button.component.html',
  styleUrls: ['./spinner-button.component.css']
})
export class SpinnerButtonComponent implements OnInit {

  @Input() content: string;
  @Input() type: string;
  @Input() disabled: boolean;

  @Output() spinnerBtClick = new EventEmitter<string>();

  spinning: boolean = false
  localDisabled = false

  @ViewChild('spinnerBt') bt: HTMLButtonElement 
  // @ViewChild('spinnerAnimation') spinner: HTMLElement

  constructor() { }

  ngOnInit(): void {
  }

  spin(on: boolean) {
    this.spinning = on
  }

  enable(on: boolean) {
    this.localDisabled = !on
  }

  lockAndSpin() {
    this.enable(false)
    this.spin(true)
  }

  release() {
    this.enable(true)
    this.spin(false)
  }

  onClick() {
    this.lockAndSpin()
    this.spinnerBtClick.emit("click")
  }

}
