import "mocha";
import * as httpMocks from "node-mocks-http";
import * as sinon from "sinon";

import { Thing } from "../Thing";

import { v4 as uuidv4 } from "uuid";

import { DTOProperty } from "@datacentricdesign/types";
import { Log } from "../../Logger";
import { ThingService } from "../services/ThingService";
import { expect } from "chai";
import { PropertyController } from "./PropertyController";
import { DCDRequest } from "../../config";

let propertyController: PropertyController;
let thingService: ThingService;
let thing: Thing;
let createdThing: Thing;
let dtoProperty: DTOProperty;
let personId: string;

describe("Property Controller", function () {
  before(async function () {
    this.timeout(10000);
    propertyController = new PropertyController();

    // Test values
    thing = new Thing();
    thing.name = "Test Thing";
    thing.description = "A test thing.";
    thing.type = "GENERIC";
    thing.personId = "dcd:persons:test@test.com";
    thingService = ThingService.getInstance();
    createdThing = await thingService.createNewThing(thing);

    personId = "dcd:persons:" + uuidv4();

    dtoProperty = {
      name: "Test property",
      description: "A test prop",
      typeId: "ACCELEROMETER",
    };
  });

  it("It should create a property.", function (done: Mocha.Done) {
    const request: DCDRequest = httpMocks.createRequest({
      method: "POST",
      url: "/things/" + createdThing.id + "/properties",
      params: {
        thingId: createdThing.id,
      },
      body: dtoProperty,
    });
    request.context = {
      userId: personId,
    };

    const response = httpMocks.createResponse();
    const next = sinon.spy();

    propertyController
      .createNewProperty(request, response, next)
      .then(() => {
        expect(next.notCalled).to.be.true;
        expect(response.statusCode).to.equal(
          201,
          "HTTP response should have http status 201."
        );
        const data = response._getJSONData();
        Log.debug(data);
        done();
      })
      .catch((error) => {
        done(error);
      });
  });

  after(async function () {
    await thingService.deleteOneThing(createdThing.id);
    // await PropertyService.release(this);
    return Promise.resolve();
  });
});
