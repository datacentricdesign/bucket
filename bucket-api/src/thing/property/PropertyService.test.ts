import "mocha";
import { Thing } from "../Thing";
import { PropertyService } from "./PropertyService";
import { DCDError, DTOProperty } from "@datacentricdesign/types";
import { Log } from "../../Logger";
import { ThingService } from "../services/ThingService";
import { expect } from "chai";
import { Property } from "./Property";
import { PropertyType } from "./propertyType/PropertyType";

let propertyService: PropertyService;
let thingService: ThingService;
let thing: Thing;
let createdThing: Thing;
let createdProperty: Property;
let dtoProperty: DTOProperty;

describe("Property Service", function () {
  before(async function () {
    propertyService = await PropertyService.getInstance(this);

    // Test values
    thing = new Thing();
    thing.name = "Test Thing";
    thing.description = "A test thing.";
    thing.type = "GENERIC";
    thing.personId = "dcd:persons:test@test.com";
    thingService = ThingService.getInstance();
    createdThing = await thingService.createNewThing(thing);

    dtoProperty = {
      name: "Test property",
      description: "A test prop",
      typeId: "ACCELEROMETER",
    };
  });

  it("It should create a property.", function (done: Mocha.Done) {
    propertyService
      .createNewProperty(createdThing, dtoProperty)
      .then((newProperty) => {
        createdProperty = newProperty;
        // Property ID should start with dcd:things: followed by a UUID v4
        const rePropertyId = new RegExp(
          /^dcd:properties:[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i
        );
        expect(rePropertyId.test(createdProperty.id)).to.be.true;
        expect(createdProperty.thing.id).to.equal(createdThing.id);
        // The dimension for the requested type should be automatically created
        // We expect 3 dimensions for the type ACCELEROMETER
        expect(createdProperty.type.dimensions.length).to.equal(3);
        done();
      })
      .catch((error: DCDError) => {
        Log.error(error);
        done(error);
      });
  });

  it("It should find the property.", function (done: Mocha.Done) {
    propertyService
      .getOnePropertyById(createdThing.id, createdProperty.id)
      .then((foundProperty: Property) => {
        expect(foundProperty.id).to.equal(createdProperty.id);
        Log.info(foundProperty);
        done();
      })
      .catch((error: DCDError) => {
        Log.error(error);
        done(error);
      });
  });

  it("It should find one property for the test thing.", function (done: Mocha.Done) {
    propertyService
      .getPropertiesOfAThing(createdThing.id)
      .then((foundProperties: Property[]) => {
        expect(foundProperties.length).to.equal(1);
        done();
      })
      .catch((error: DCDError) => {
        Log.error(error);
        done(error);
      });
  });

  it("It should find one property of type ACCELEROMETER for the test thing.", function (done: Mocha.Done) {
    propertyService
      .getPropertiesOfAThingByType(createdThing.id, dtoProperty.typeId)
      .then((foundProperties: Property[]) => {
        expect(foundProperties.length).to.equal(1);
        done();
      })
      .catch((error: DCDError) => {
        Log.error(error);
        done(error);
      });
  });

  it("It should NOT find any property of type GYROSCOPE for the test thing.", function (done: Mocha.Done) {
    propertyService
      .getPropertiesOfAThingByType(createdThing.id, "GYROSCOPE")
      .then((foundProperties: Property[]) => {
        expect(foundProperties.length).to.equal(0);
        done();
      })
      .catch((error: DCDError) => {
        Log.error(error);
        done(error);
      });
  });

  it("It should edit the property name and description.", function (done: Mocha.Done) {
    const editedName = "A new name";
    const editedDescription = "A new description";
    createdProperty.name = editedName;
    createdProperty.description = editedDescription;
    propertyService
      .editOneProperty(createdProperty)
      .then((editedProperty) => {
        expect(editedProperty.name).to.equal(editedName);
        expect(editedProperty.description).to.equal(editedDescription);
        done();
      })
      .catch((error: DCDError) => {
        Log.error(error);
        done(error);
      });
  });

  it("It should find the details of the type for the property, and cache them.", function (done: Mocha.Done) {
    propertyService
      .getPropertyType(createdProperty.id)
      .then((foundType: PropertyType) => {
        expect(foundType.id).to.equal(createdProperty.type.id);
        expect(foundType.dimensions.length).to.equal(3);
        expect(propertyService.getCache().size).to.equal(1);
        expect(propertyService.getCache().has(createdProperty.id)).is.true;
        done();
      })
      .catch((error: DCDError) => {
        Log.error(error);
        done(error);
      });
  });

  it("It should add values to the property.", function (done: Mocha.Done) {
    const now = Date.now();
    createdProperty.values = [
      [now - 7000, 1.3, 2.2, 3.4],
      [now - 5000, 1.7, 2.3, 3.0],
      [now, 1.1, 2.4, 3.1],
    ];
    propertyService
      .updatePropertyValues(createdProperty)
      .then(() => {
        done();
      })
      .catch((error: DCDError) => {
        Log.error(error);
        done(error);
      });
  });

  it("It should get values from the property.", function (done: Mocha.Done) {
    propertyService
      .getOnePropertyById(createdProperty.thing.id, createdProperty.id, {
        from: 0,
        to: Date.now(),
        timeInterval: undefined,
        fctInterval: undefined,
        fill: undefined,
      })
      .then((foundProperty) => {
        Log.info(foundProperty.values);
        expect(foundProperty.values.length).to.equal(3);
        done();
      })
      .catch((error: DCDError) => {
        Log.error(error);
        done(error);
      });
  });

  it("It should get value count from the property.", function (done: Mocha.Done) {
    propertyService
      .getOnePropertyById(createdProperty.thing.id, createdProperty.id, {
        from: 0,
        to: Date.now(),
        timeInterval: "5s",
        fctInterval: "count",
        fill: undefined,
      })
      .then((foundProperty) => {
        Log.info(foundProperty.values);
        expect(foundProperty.values.length).to.equal(2);
        done();
      })
      .catch((error: DCDError) => {
        Log.error(error);
        done(error);
      });
  });

  it("It should delete the property.", function (done: Mocha.Done) {
    propertyService
      .deleteOneProperty(createdProperty.thing.id, createdProperty.id)
      .then(() => {
        propertyService
          .deleteOneProperty(createdProperty.thing.id, createdProperty.id)
          .then(() => {
            done(new Error("Should not be able to delete the second time."));
          })
          .catch((error: DCDError) => {
            expect(error.errorCode).to.equal(404);
            done();
          });
      })
      .catch((error: DCDError) => {
        Log.error(error);
        done(error);
      });
  });

  after(async function () {
    await thingService.deleteOneThing(createdThing.id);
    // await PropertyService.release(this);
    return Promise.resolve();
  });
});
