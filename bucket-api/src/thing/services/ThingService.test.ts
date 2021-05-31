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

  it("Create a Thing", (done: Mocha.Done) => {
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

  it("Create a Thing - Missing name", (done: Mocha.Done) => {
    // Test values
    const thingWithoutName = new Thing();
    thingWithoutName.description = "A test thing.";
    thingWithoutName.type = "GENERIC";
    thingWithoutName.personId = "dcd:persons:test@test.com";

    thingService
      .createNewThing(thingWithoutName)
      .then((newThing: Thing) => {
        done(new Error("Should not create thing without name."));
      })
      .catch((error: DCDError) => {
        expect(error.errorCode).to.equal(4003);
        done();
      });
  });

  it("Create a Thing - Missing type", (done: Mocha.Done) => {
    // Test values
    const thingWithoutType = new Thing();
    thingWithoutType.name = "Test Thing";
    thingWithoutType.description = "A test thing.";
    thingWithoutType.personId = "dcd:persons:test@test.com";

    thingService
      .createNewThing(thingWithoutType)
      .then((newThing: Thing) => {
        done(new Error("Should not create thing without type."));
      })
      .catch((error: DCDError) => {
        expect(error.errorCode).to.equal(4003);
        done();
      });
  });

  // it("Edit Thing - Change PEM", (done: Mocha.Done) => {
  //   // Test values
  //   const pem = `-----BEGIN PUBLIC KEY-----
  //   MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA1ugLkVZT1WoY6xu/t8M7
  //   8oNyP4274q0CRFf1MYQyMKEULpWjlq3uudIIcp15AaJl+jxRDkCEb12B8ex/PDKQ
  //   adYg3FZ/TR2QB5RvotiD6gn5w2HhPwUu35ETFfnIKmidPXLHvchPh9AFrbla5hwl
  //   migCiLx7rwApFqbuhqN2R76LNJ67mxsQ9Hzdt1PcQohPtaG17bratcH3hF5YzTn+
  //   1Bd3D2zH8vK7WQVVBSL9zLuWg2OSBJFF39ceWfAcMJp8+YRV2w/uQlS5TqgL6lS+
  //   7II+1LGOMnT8LiZ4Akwu5Uly0JOE+zf9VDaZQYbLjuSe6puaDa+zGDoKDuLpFmVw
  //   0tVd1kWtHuGEK5HXL7olYUxF9EneeoL7Gba32FWcGV2d5onhYA99hq6sM6Hefxvo
  //   b/HgeTAAuxNhtKSEMX7FYSEcsn2Vtv/t2S1b5yvqxxYfSY8QS+fHAzZXT0TBx1yg
  //   ibOvWBCkwWgXmbg4in9LOOCla34xSWKY7Ba0wSdQuEO4xattaG7aZL/bfx8JB+hT
  //   iIv8NJTIHq1uHsUGP9iVfil1Uify6ypyJON97yAAylT8Muiuh6QBNMqQ0B8WF+tl
  //   QDg2NjCGl/ioRAe5Kp0fIO2SbRLBci63CgMHqIQSFMtK5yph91jjpzuQvM+eIB08
  //   UqiT7uj6UAVOlsf5fBlL7QkCAwEAAQ==
  //   -----END PUBLIC KEY-----`
  //   thingService
  //     .editThingPEM(thing.id, pem)
  //     .then((jwk: string) => {
  //       Log.debug(jwk);
  //       done();
  //     })
  //     .catch((error: DCDError) => {
  //       // Log.error(error)
  //       done(error);
  //     });
  // });

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
