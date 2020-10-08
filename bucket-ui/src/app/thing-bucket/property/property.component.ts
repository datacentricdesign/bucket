import { Component, OnInit, ViewChild } from '@angular/core';
import { DTOProperty, Property, ValueOptions } from '@datacentricdesign/types';
import { Observable, throwError } from 'rxjs';
import { Title } from '@angular/platform-browser';
import { AppService } from 'app/app.service';
import { ThingService } from '../services/thing.service';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { OAuthService } from 'angular-oauth2-oidc';
import { catchError, map } from 'rxjs/operators';

import * as moment from 'moment';
import { SpinnerButtonComponent } from '../spinner-button/spinner-button.component';

@Component({
  selector: 'app-property',
  templateUrl: './property.component.html'
})
export class PropertyComponent implements OnInit {

  private apiURL: string

  @ViewChild('downloadCSVBt') downloadCSVBt: SpinnerButtonComponent;
  @ViewChild('uploadCSVBt') uploadCSVBt: SpinnerButtonComponent;
  @ViewChild('grantBt') grantBt: SpinnerButtonComponent;

  @ViewChild('editNameBt') editNameBt: SpinnerButtonComponent;
  @ViewChild('editDescBt') editDescBt: SpinnerButtonComponent;

  @ViewChild('deleteBt') deleteBt: SpinnerButtonComponent;

  property$: Observable<Property>;

  thingId: string;
  id: string;
  description: string
  name: string
  property: Property

  consents$: Observable<any>;
  consents: any

  downloadModel: any = {
    from: moment().subtract(1, 'days').format('YYYY-MM-DD'),
    to: moment().format('YYYY-MM-DD'),
    timeInterval: undefined,
    fctInterval: undefined,
    fill: 'none'
  }

  uploadModel: any = {
    hasLabel: false,
    fileToUpload: File = null
  }

  uploadCSVExampleLabels = ""
  uploadCSVExampleValues = ""

  updateProperty: DTOProperty = {
    name: '',
    description: ''
  }

  grantModel = {
    subjects: '',
    actions: 'dcd:read'
  }

  constructor(
    private _Activatedroute: ActivatedRoute,
    private _router: Router,
    private http: HttpClient,
    private oauthService: OAuthService,
    private titleService: Title,
    private appService: AppService,
    private thingService: ThingService) {
    this.apiURL = appService.settings.apiURL
  }

  ngOnInit(): void {

    this._Activatedroute.queryParams
      .subscribe(params => {
        if (params.success !== undefined) {
          this.thingService.toast(params.success, "success")
        } else if (params.error !== undefined) {
          this.thingService.toast(params.error, "danger")
        }
      });

    this._Activatedroute.paramMap.subscribe(params => {
      this.thingId = params.get('id');
      this.id = params.get('propertyId');
      let headers = new HttpHeaders().set('Accept', 'application/json')
        .set('Authorization', 'Bearer ' + this.oauthService.getAccessToken());
      this.property$ = this.http.get<Property>(this.apiURL + "/things/" + this.thingId + '/properties/' + this.id, { headers }).pipe(
        map((data: Property) => {
          this.property = data
          this.titleService.setTitle(this.property.name);
          this.buildUploadExample()
          return data;
        }), catchError(error => {
          console.log(error)
          return throwError('Property not found!');
        })
      )

      this.consents$ = this.http.get<any>(this.apiURL + "/things/" + this.thingId + '/properties/' + this.id + '/consents', { headers }).pipe(
        map((data: any) => {
          this.consents = data
          return data;
        }), catchError(error => {
          return throwError('Consents not found!');
        })
      )
    });
  }

  editName() {
    this.thingService.editProperty(this.thingId, this.id, { name: this.updateProperty.name })
      .then(() => {
        // TODO replace the reload with inside changes, missing the sidebar update
        // this.thingService.toast("Name updated.", "success")
        // this.property.name = this.updateProperty.name
        // this.updateProperty.name = ""
        window.location.href = './things/' + this.thingId + '/properties/' + this.id + '?success=Updated+Name.';
      })
      .catch(error => {
        this.thingService.toast(error)
      })
      .finally(() => this.editNameBt.release())

  }

  editDescription() {
    this.thingService.editProperty(this.thingId, this.id, { description: this.updateProperty.description })
      .then(() => {
        this.thingService.toast("Description updated.", "success")
        this.property.description = this.updateProperty.description
        this.updateProperty.description = ""
      })
      .catch(error => {
        this.thingService.toast(error)
      })
      .finally(() => this.editDescBt.release())
  }

  delete() {
    this.thingService.deleteProperty(this.thingId, this.id)
      .then(() => {
        window.location.href = './things/' + this.id + '?success=Deleted+Property.';
      })
      .catch(error => {
        this.thingService.toast(error)
      })
      .finally(() => this.deleteBt.release())
  }

  download() {
    const options: ValueOptions = {
      from: moment(this.downloadModel.from, "YYYY-MM-DD").unix() * 1000,
      to: moment(this.downloadModel.to, "YYYY-MM-DD").unix() * 1000 + 86400000,
      timeInterval: this.downloadModel.timeInterval,
      fctInterval: this.downloadModel.fctInterval,
      fill: this.downloadModel.fill
    }
    const csvFormat = true
    this.thingService.getPropertyValues(this.thingId, this.id, options, csvFormat)
      .then((blob) => {
        const a = document.createElement('a')
        const objectUrl = URL.createObjectURL(blob)
        a.href = objectUrl
        a.download = this.id + '.csv';
        a.click();
        URL.revokeObjectURL(objectUrl);
      })
      .catch((error) => {
        this.thingService.toast(error)
      })
      .finally(() => {
        this.downloadCSVBt.release()
      });
  }

  grant() {
    this.thingService.grant(
      this.thingId,
      this.id,
      this.grantModel.subjects.split(';'),
      this.grantModel.actions.split(';'))
      .then(() => {
        // TODO replace the reload with inside changes, missing the sidebar update
        // this.thingService.toast("Name updated.", "success")
        // this.thing.name = this.updateThing.name
        // this.updateThing.name = ""
        window.location.href = './things/' + this.thingId + "/properties/" + this.id + '?success=Granted+Permision.';
      })
      .catch((error) => {
        this.grantBt.release()
        this.thingService.toast(error)
      })
  }

  revoke(consentId: string) {
    this.thingService.revoke(this.thingId, this.id, consentId)
      .then(() => {
        window.location.href = './things/' + this.thingId + "/properties/" + this.id + '?success=Revoked+Permision.';
      })
      .catch((error) => {
        this.thingService.toast(error)
      })
  }

  buildUploadExample() {
    let example = '"Time"'
    const dim = this.property.type.dimensions
    for (let i = 0; i < dim.length; i++) {
      example += ',"' + dim[i].name + '"'
    }
    this.uploadCSVExampleLabels = example
    example = "time"
    for (let i = 0; i < dim.length; i++) {
      example += "," + dim[i].type
    }
    this.uploadCSVExampleValues = example
  }

  // keyword = 'name';
  // data = [
  //   {
  //     id: 1,
  //     name: 'Usa'
  //   },
  //   {
  //     id: 2,
  //     name: 'England'
  //   }
  // ];


  // selectEvent(item) {
  //   // do something with selected item
  // }

  // onChangeSearch(val: string) {
  //   // fetch remote data from here
  //   // And reassign the 'data' which is binded to 'data' property.
  //   console.log(val)
  // }

  // onFocused(e){
  //   // do something when input is focused
  // }
  uploadCSVData() {
    this.thingService.csvFileUpload(this.thingId, this.id, this.uploadModel.fileToUpload, this.uploadModel.hasLabel)
      .then((result) => {
        this.thingService.toast("Data Uploaded", 'success', 'nc-cloud-upload-94');
        (document.getElementById("csvFileToUpload") as HTMLInputElement).value = ""
        this.uploadModel.fileToUpload = undefined
      })
      .catch(error => {
        this.thingService.toast(error, 'error', 'nc-cloud-upload-94')
      })
      .finally(() => {
        this.uploadCSVBt.release()
      })
  }

  copyId() {
    var range = document.createRange();
    range.selectNode(document.getElementById("id-property-to-copy"));
    window.getSelection().removeAllRanges(); // clear current selection
    window.getSelection().addRange(range); // to select text
    document.execCommand("copy");
    window.getSelection().removeAllRanges();// to deselect
    document.execCommand('copy')
    this.thingService.toast("Property ID copied to clipboad.", "success", "nc-single-copy-04")
  }

  handleFileInput(event: any) {
    const files: FileList = event.target.files
    if (files.length === 1) {
      const file = files.item(0)
      if (file.type === 'text/csv' || (file.type === 'application/vnd.ms-excel' && file.name.endsWith('.csv')) ) {
        // We expect 1 column per dimension + time
        const expectedNumColumns = this.property.type.dimensions.length + 1
        let countWrongNumColum = 0
        var reader = new FileReader();
        reader.readAsText(file);
        reader.onload = (data) => {
          let csvData = reader.result;
          let csvRecordsArray = (csvData as string).split(/\r\n|\n/);
          for (let i = 0; i < csvRecordsArray.length; i++) {
            if (csvRecordsArray[i] !== "") {
              let rowdata = csvRecordsArray[i].match(/(“[^”]*”)|[^,]+/g);
              if (rowdata.length !== expectedNumColumns) {
                countWrongNumColum++
              }
            }
          }

          if (countWrongNumColum !== 0) {
            return this.thingService.toast(countWrongNumColum + " records add a wrong number of fields. Your records should start with the UNIX timestamp, followed by the the values the property dimensions.")
          }
        }
        this.uploadModel.fileToUpload = file;
      } else {
        this.thingService.toast("The file to upload should be a CSV file. Provided file type: " + file.type)
      }
    }
  }
}