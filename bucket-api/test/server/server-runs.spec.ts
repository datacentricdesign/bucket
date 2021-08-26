import { Application } from "express";
import * as supertest from "supertest"

import config from "../../src/config";

import { HttpAPI } from "../../src/http/HttpAPI";

describe("Server checks", () => {

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

    it("Server is created without error", (done) => {
        request.get(config.http.baseUrl + "/").expect(200, done);
    })
});