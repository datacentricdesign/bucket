import { expect } from "chai";
import { DCDError } from "@datacentricdesign/types";
import Log from "../../Log";
import { ThingService } from "./ThingService";
import Thing from "../Thing";

let thingService: ThingService;
let thing: Thing;
let createdThing: Thing;

describe("Thing Service", () => {
  before(async () => {
    thingService = ThingService.getInstance();
    // Test values
    thing = new Thing();
    thing.name = "Test Thing";
    thing.description = "A test thing.";
    thing.type = "GENERIC";
    thing.personId = "dcd:persons:test@test.com";
  });

  it("Create", (done: Mocha.Done) => {
    thingService
      .createNewThing(thing)
      .then((newThing: Thing) => {
        createdThing = newThing;
        expect(createdThing.name).to.equal(thing.name);
        expect(createdThing.description).to.equal(thing.description);
        expect(createdThing.type).to.equal(thing.type);
        expect(createdThing.personId).to.equal(thing.personId);
        // Thing ID should start with dcd:things: followed by a UUID v4
        const reThingId = new RegExp(
          /^dcd:things:[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i
        );
        expect(reThingId.test(createdThing.id)).to.be.true;
        done();
      })
      .catch((error: DCDError) => {
        Log.error(error);
        done(error);
      });
  });

  it("Get One Thing by Id", (done: Mocha.Done) => {
    ThingService.getOneThingById(createdThing.id)
      .then((foundThing: Thing) => {
        expect(foundThing.name).to.equal(thing.name);
        expect(foundThing.description).to.equal(thing.description);
        expect(foundThing.type).to.equal(thing.type);
        expect(foundThing.personId).to.equal(thing.personId);
        expect(foundThing.id).to.equal(createdThing.id);
        done();
      })
      .catch((error: DCDError) => {
        Log.error(error);
        done(error);
      });
  });

  it("Get Things of a Person", (done: Mocha.Done) => {
    ThingService.getThingsOfAPerson(createdThing.personId)
      .then((foundThings: Thing[]) => {
        expect(foundThings.length).to.equal(1);
        expect(foundThings[0].id).to.equal(createdThing.id);
        done();
      })
      .catch((error: DCDError) => {
        Log.error(error);
        done(error);
      });
  });

  it("Edit One Thing", (done: Mocha.Done) => {
    const editedName = "A new name";
    const editedDescription = "A new description";
    createdThing.name = editedName;
    createdThing.description = editedDescription;
    ThingService.editOneThing(createdThing)
      .then((editedThing: Thing) => {
        expect(editedThing.name).to.equal(editedName);
        expect(editedThing.description).to.equal(editedDescription);
        expect(editedThing.type).to.equal(thing.type);
        expect(editedThing.personId).to.equal(thing.personId);
        expect(editedThing.id).to.equal(createdThing.id);
        done();
      })
      .catch((error: DCDError) => {
        Log.error(error);
        done(error);
      });
  });

  it("Delete", (done: Mocha.Done) => {
    ThingService.deleteOneThing(thing.id)
      .then(() => {
        done();
      })
      .catch((error: DCDError) => {
        Log.error(error);
        done(error);
      });
  });
});
