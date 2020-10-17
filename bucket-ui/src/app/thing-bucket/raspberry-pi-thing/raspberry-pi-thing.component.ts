import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { ThingService, Download } from '../services/thing.service';
import * as moment from 'moment'
import { Observable } from 'rxjs';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfirmedValidator } from './confirmed.validator';
import { ConditionalRequirementValidator } from './conditional-requirement.validator';

@Component({
  selector: 'app-raspberry-pi-thing',
  templateUrl: './raspberry-pi-thing.component.html',
  styleUrls: ['./raspberry-pi-thing.component.css']
})
export class RaspberryPiThingComponent implements OnInit {

  @Input() thingId: string;
  @Input() thingName: string;
  @Output() foundEvent = new EventEmitter<boolean>();

  download$: Observable<Download>

  found: boolean = false;
  image: boolean = false;
  status: string = '-';
  statusColor: string = 'progress-bar-info'
  stage: number
  stages: number
  progress: string
  started_at: string
  updated_at: string

  dpiGenerator: any = {error: "Service unavailable"}

  form: FormGroup = new FormGroup({});
  fieldTextRPiType: boolean;
  fieldTextHomeType: boolean;
  fieldTextWPAType: boolean;

  constructor(
    private thingService: ThingService,
    private fb: FormBuilder) {
    this.form = fb.group({
      first_user_name: ['', [Validators.required]],
      first_user_password: ['', [Validators.required]],
      first_user_password_confirm: ['', []],
      target_hostname: ['', []],
      enable_SSH: [true, []],
      home_ESSID: ['', []],
      home_password: ['', []],
      home_password_confirm: ['', []],
      wpa_ESSID: ['eduroam', []],
      wpa_password: ['', []],
      wpa_password_confirm: ['', []],
      wpa_country: ['', []]
    }, {
      validators: [
        ConfirmedValidator('first_user_password', 'first_user_password_confirm'),
        ConfirmedValidator('home_password', 'home_password_confirm'),
        ConfirmedValidator('wpa_password', 'wpa_password_confirm'),
        ConditionalRequirementValidator('wpa_password', 'wpa_country')
      ]
    })
  }

  async ngOnInit(): Promise<void> {
    this.thingService.getDPiHealth().then((result) => {
      this.dpiGenerator = result
      this.suggestHostname()
      this.refreshData()
    }).catch((error) => {
      
    })
  }

  get f() {
    return this.form.controls;
  }

  async refreshData() {
    if (this.thingId !== undefined) {
      try {
        const result = await this.thingService.dpiStatus(this.thingId)
        if (result.code !== undefined) {
          this.found = true;
          this.status = result.message
          if (result.code === 0) {
            this.image = true
          } else {
            this.stage = result.stage
            this.stages = result.stages
            this.progress = (result.stage / (result.stages + 1) * 100) + '%'
            if (result.started_at !== undefined) {
              this.started_at = moment(new Date(result.started_at * 1000)).fromNow()
            }
            if (result.updated_at !== undefined) {
              this.updated_at = moment(new Date(result.updated_at * 1000)).fromNow()
            }
            setTimeout(this.refreshData.bind(this), 30000)
          }
        }
      } catch (error) {
        // image or current process not found, we do not update anything
        if (error.error !== undefined && error.error.errorCode !== 404) {
          this.found = false;
          this.progress = '100%'
          this.statusColor = 'progress-bar-danger'
          this.status = error.error._hint
        }
      } finally {
        this.onFoundChange()
      }
    }
  }

  suggestHostname(): void {
    this.form.controls["target_hostname"].setValue(this.thingName.toLowerCase().trim().split(' ').join('-'));
  }

  cancel() {
    const button = document.getElementById("cancelGeneration") as HTMLButtonElement
    button.disabled = true
    const spinner = document.getElementById("spinnerCancelGeneration") as HTMLElement
    spinner.style.display = 'inline-block'
    this.thingService.dpiCancel(this.thingId).then(() => {
      window.location.reload()
    })
  }

  delete() {
    this.thingService.dpiDelete(this.thingId)
      .then(() => {
        window.location.reload()
      })
      .catch((error) => {
          this.thingService.toast(error)
      })

  }

  download() {
    const button = document.getElementById("downloadImage") as HTMLButtonElement
    button.disabled = true
    const spinner = document.getElementById("spinnerDownloadImage") as HTMLElement
    spinner.style.display = 'inline-block'
    this.download$ = this.thingService.dpiDownload(this.thingId)
  }

  onFoundChange() {
    this.foundEvent.emit(this.found);
  }

  getValues() {
    const dpi = this.form.controls

    // Prepare the body with network blocks if full settings
    const body: any = {
      first_user_name: dpi["first_user_name"].value,
      first_user_password: dpi["first_user_password"].value,
      target_hostname: dpi["target_hostname"].value,
      enable_SSH: dpi["enable_SSH"].value
    }

    if (dpi["home_ESSID"].value && dpi["home_password"].value) {
      body.home_ESSID = dpi["home_ESSID"].value;
      body.home_password = dpi["home_password"].value;
    }

    if (dpi["wpa_ESSID"].value && dpi["wpa_password"].value && dpi["wpa_country"].value) {
      body.wpa_ESSID = dpi["wpa_ESSID"].value;
      body.wpa_password = dpi["wpa_password"].value;
      body.wpa_country = dpi["wpa_country"].value;
    }
    return body
  }

  toggleFieldTextRPiType() {
    this.fieldTextRPiType = !this.fieldTextRPiType;
  }

  toggleFieldTextHomeType() {
    this.fieldTextHomeType = !this.fieldTextHomeType;
  }

  toggleFieldTextWPAType() {
    this.fieldTextWPAType = !this.fieldTextWPAType;
  }

}
