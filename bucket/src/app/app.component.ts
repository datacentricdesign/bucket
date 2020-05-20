import { Component } from '@angular/core';
import { SupportDialogComponent } from './support-dialog/support-dialog.component';
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {

  constructor(private dialog: MatDialog) { }

}