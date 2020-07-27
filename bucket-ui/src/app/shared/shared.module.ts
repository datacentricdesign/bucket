import { NgModule, ModuleWithProviders } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthGuard } from './auth/auth.guard';
import { ThingFormComponent } from './thing-form/thing-form.component';

@NgModule({
  imports: [
    FormsModule, // [(ngModel)]
    CommonModule // ngFor, ngIf, ngStyle, ngClass, date, json
  ],
  providers: [],
  declarations: [
    ThingFormComponent
  ],
  exports: [
    ThingFormComponent
  ]
})
export class SharedModule {
  static forRoot(): ModuleWithProviders<SharedModule> {
    return {
      providers: [AuthGuard],
      ngModule: SharedModule
    };
  }
}
