import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
// import { FormGroup, FormBuilder } from '@angular/forms';

@Component({
  selector: 'app-support-dialog',
  templateUrl: './support-dialog.component.html',
  styleUrls: ['./support-dialog.component.css']
})
export class SupportDialogComponent implements OnInit {

  // form: FormGroup;
  description: string;

  constructor(private dialogRef: MatDialogRef<SupportDialogComponent>){}
    // private fb: FormBuilder,
    // private dialogRef: MatDialogRef<SupportDialogComponent>,
  //   @Inject(MAT_DIALOG_DATA) data) {

  //   this.description = data.description;
  // }

  ngOnInit(): void {
    // this.form = this.fb.group({
    //   description: [this.description, []],
    // });
  }

  save() {
    this.dialogRef.close();
  }

  close() {
    this.dialogRef.close();
  }

}
