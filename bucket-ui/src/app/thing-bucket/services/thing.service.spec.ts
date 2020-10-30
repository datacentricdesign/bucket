import { inject, TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { AppService } from 'app/app.service';
import { ThingService } from './thing.service';
import { OAuthService } from 'angular-oauth2-oidc';

let httpClientSpy: { get: jasmine.Spy };
let thingService: ThingService

describe('ThingService', () => {

    beforeEach(() => {
        httpClientSpy = jasmine.createSpyObj('HttpClient', ['get']);
        oauthService = new OAuthService()
        thingService = new ThingService(httpClientSpy, appService)
        // TestBed.configureTestingModule({
        //     imports: [HttpClient],
        //     providers: [
        //         { provide: AppService },
        //         ThingService
        //     ]
        // });

    });

    describe('find()', () => {

        it('should return an Observable<Array<Video>>', () => {
            // test goes here
        });

        it('should return an Observable<Array<Video>>',
            inject([ThingService], (thingService) => {
                // test goes here
            }));
    });
});