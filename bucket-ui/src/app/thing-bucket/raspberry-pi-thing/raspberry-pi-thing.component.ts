import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { ThingService, Download } from '../services/thing.service';
import * as moment from 'moment'
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';

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

  raspberryPi: any = {
    first_user_name: '',
    first_user_password: '',
    target_hostname: '',
    home_ESSID: '',
    home_password: '',
    wpa_ESSID: 'eduroam',
    wpa_password: '',
    wpa_country: '',
    enable_SSH: true
  }

  constructor(private thingService: ThingService,
    private toastr: ToastrService) { }

  async ngOnInit(): Promise<void> {
    this.suggestHostname()
    this.refreshData()
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
    this.raspberryPi.target_hostname = this.thingName.toLowerCase().trim().split(' ').join('-');
  }

  selectCountryCode() {
    this.raspberryPi.wpa_country = (document.getElementById('wpa_country') as HTMLSelectElement).value;
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
    this.thingService.dpiDelete(this.thingId).then(() => {
      window.location.reload()
    })
  }

  download() {
    const button = document.getElementById("downloadImage") as HTMLButtonElement
    button.disabled = true
    const spinner = document.getElementById("spinnerDownloadImage") as HTMLElement
    spinner.style.display = 'inline-block'
    this.download$ = this.thingService.dpiDownload(this.thingId)
    
    // .then((blob) => {
    //   // const a = document.createElement('a')
    //   // const objectUrl = URL.createObjectURL(blob)
    //   // a.href = objectUrl
    //   // a.download = this.thingId.replace('dcd:things:', '') + '.zip';
    //   // a.click();
    //   // URL.revokeObjectURL(objectUrl);
    //   saveAs(blob, 'dpi_image_' + this.thingId.replace('dcd:things:', '') + '.zip')
    //   button.disabled = false
    //   spinner.style.display = 'none'
    // }).catch((error) => {
    //   console.warn('status', error.status);
    //   this.toast(error.status, 'error', 'nc-cloud-download');
    //   button.disabled = false
    //   spinner.style.display = 'none'
    // })
  }

  onFoundChange() {
    this.foundEvent.emit(this.found);
  }

  toast(message: string, type: string, icon: string) {
    this.toastr.info(
      '<span data-notify="icon" class="nc-icon ' + icon + '"></span><span data-notify="message">' + message + '</span>',
      "",
      {
        timeOut: 4000,
        closeButton: true,
        enableHtml: true,
        toastClass: "alert alert-" + type + " alert-with-icon",
        positionClass: "toast-top-center"
      }
    );
  }

}
