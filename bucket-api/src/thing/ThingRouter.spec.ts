import { Response, NextFunction } from 'express';
import * as sinon from 'sinon';
import * as supertest from "supertest"

import config, { DCDRequest } from "../../src/config";

import { HttpAPI } from "../../src/http/HttpAPI";
import { AuthController } from '../auth/AuthController';
import { Thing } from './Thing';
import { ThingController } from './ThingController';
import { ThingService } from './ThingService';

describe("ThingRouter", () => {

    let httpAPI: HttpAPI = null;
    let request = null

    before(function (done) {
        httpAPI = new HttpAPI();
        request = supertest(httpAPI.app)
        done()
    })

    after(function (done) {
        done()
    })

    it("Check Thing API health.", function(done) {
        request.get(config.http.baseUrl + "/things/health").expect(200, done);
    })

    it('Check router GET /things', function(done) {
        sinon.stub(AuthController.prototype, '_authenticate').callsFake(
            (requiredScope: string[],
                req: DCDRequest,
                next: NextFunction
            ): Promise<void> => {
                req.context = {
                    userId: "user-test",
                  };
                next();
                return Promise.resolve()
            });
        sinon.stub(ThingService.prototype, 'getThingsOfAPerson').callsFake(
            (personId: string): Promise<Thing[]> => {
                console.log("fake: " + personId)
                return Promise.resolve([]);
            })
        request.get(config.http.baseUrl + "/things").expect(200, done);
    });
});