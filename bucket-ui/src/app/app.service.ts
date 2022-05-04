import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class AppService {

  constructor(private http: HttpClient) { }

  private configSettings: any = null;

  get settings() {
    return this.configSettings;
  }

  public load(): Promise<any> {
    return new Promise((resolve, reject) => {
      let configUrl = `assets/config/dev.config.json`
      if (environment.production) {
        configUrl =  `assets/config/prod.config.json`
      }
      this.http.get(configUrl).subscribe((response: any) => {
        this.configSettings = response;
        resolve(true);
      });
    });
  }
}