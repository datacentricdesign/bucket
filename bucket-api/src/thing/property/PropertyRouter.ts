import { Router } from "express";

import { introspectToken } from "../middlewares/introspectToken";
import { checkPolicy } from "../middlewares/checkPolicy";
import { PropertyController } from "./PropertyController";

export class PropertyRouter {
  private router: Router;
  private controller: PropertyController;

  constructor() {
    this.router = Router({ mergeParams: true });
    this.controller = new PropertyController();
    this.setRoutes();
  }

  getRouter(): Router {
    return this.router;
  }

  getController(): PropertyController {
    return this.controller;
  }

  setRoutes(): void {
    /**
     * @api {get} /things/:thingId/properties List
     * @apiGroup Property
     * @apiDescription Get Properties of a Thing.
     *
     * @apiParam {String} thingId Id of the Thing from which we get the properties.
     *
     * @apiParam (Query) {Number} [from] The start time (UNIX timestamp) to get the data count for each property.
     * @apiParam (Query) {String} [timeInterval] The time interval (e.g. 1h for one hour, 5s for five seconds) to split the data count for each property.
     *
     * @apiVersion 0.1.0
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiSuccess (Success 200) {Property[]} properties List of retrieved Properties
     *
     * @apiError {DCDError} 403 Not permitted
     **/
    this.router.get(
      "/",
      [introspectToken(["dcd:properties"]), checkPolicy("read")],
      this.controller.getProperties
    );

    /**
     * @api {post} /things/:thingId/properties Create
     * @apiGroup Property
     * @apiDescription Create a Property.
     *
     * @apiVersion 0.1.0
     *
     * @apiParam {String} thingId Id of the Thing to which we add the Property.
     *
     * @apiParam (Body) {DTOProperty} property Property to create as JSON.
     * @apiParamExample {json} property:
     *     {
     *       "name": "My Property",
     *       "description": "A description of my property.",
     *       "typeId": "PROPERTY_TYPE"
     *     }
     *
     * @apiHeader {String} Content-type application/json
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiSuccess (Success 201) {Property} The created Property
     *
     * @apiError {DCDError} 400 Bad request
     * @apiError {DCDError} 404 Not found
     */
    this.router.post(
      "/",
      [introspectToken([]), checkPolicy("create")],
      this.controller.createNewProperty
    );

    /**
     * @api {get} /things/:thingId/properties/:propertyId Read
     * @apiGroup Property
     * @apiDescription Get one Property.
     *
     * @apiVersion 0.1.0
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiParam {String} thingId Id of the Thing containing the Property to read.
     * @apiParam {String} propertyId Id of the Property to read.
     *
     * @apiSuccess {Property} property The retrieved Property
     **/
    this.router.get(
      "/:propertyId",
      [introspectToken(["dcd:properties"]), checkPolicy("read")],
      this.controller.getOnePropertyById
    );

    /**
     * @api {patch} /things/:thingId/properties/:propertyId Update
     * @apiGroup Property
     * @apiDescription Edit one Property to change its name or description.
     *
     * @apiVersion 0.1.0
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiParam {String} thingId Id of the Thing containing the Property to update.
     * @apiParam {String} propertyId Id of the Property to update.
     *
     * @apiParam (Body) {Property} property Property to create as JSON.
     * @apiParamExample {json} property:
     *     {
     *       "name": "A new Property name",
     *       "description": "A new description of my property."
     *     }
     **/
    this.router.patch(
      "/:propertyId",
      [introspectToken(["dcd:properties"]), checkPolicy("update")],
      this.controller.editProperty
    );

    /**
     * @api {put} /things/:thingId/properties/:propertyId Update Values
     * @apiGroup Property
     * @apiDescription Update values of a Property.
     *
     * @apiVersion 0.1.0
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiParam {String} thingId Id of the Thing containing the Property to update.
     * @apiParam {String} propertyId Id of the Property to update.
     *
     * @apiParam (Body) {Property} property with attribute 'values', an array of array [ [timestamp, val1, val2, val3], [timestamp, val1, val2, val3], ....]
     * @apiParamExample {json} property:
     *     {
     *       "values": [[1591868318000,0,1,2],[1591868318200,3,1,1]],
     *     }
     **/
    this.router.put(
      "/:propertyId",
      [introspectToken(["dcd:properties"]), checkPolicy("update")],
      this.controller.updatePropertyValues
    );

    /**
     * @api {delete} /things/:thingId/properties/:propertyId Delete
     * @apiGroup Property
     * @apiDescription Delete one Property.
     *
     * @apiVersion 0.1.0
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiParam {String} thingId Id of the Thing containing the Property to delete.
     * @apiParam {String} propertyId Id of the Property to delete.
     **/
    this.router.delete(
      "/:propertyId",
      [introspectToken(["dcd:properties"]), checkPolicy("delete")],
      this.controller.deleteOneProperty
    );

    this.router.get(
      "/:propertyId/count",
      [introspectToken(["dcd:properties"]), checkPolicy("read")],
      this.controller.countDataPoints
    );

    this.router.get(
      "/:propertyId/last",
      [introspectToken(["dcd:properties"]), checkPolicy("read")],
      this.controller.lastDataPoints
    );

    /**
     * @api {get} /things/:thingId/properties/:propertyId/consents List consents
     * @apiGroup Property
     * @apiDescription List consents granted for one Property. Only property owner can access this list.
     *
     * @apiVersion 0.1.0
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiParam {String} thingId Id of the Thing containing the Property.
     * @apiParam {String} propertyId Id of the Property to list consents from.
     **/
    this.router.get(
      "/:propertyId/consents",
      [
        introspectToken(["dcd:properties", "dcd:consents"]),
        checkPolicy("list"),
      ],
      this.controller.listConsents
    );

    /**
     * @api {delete} /things/:thingId/properties/:propertyId/consents Revoke a consent
     * @apiGroup Property
     * @apiDescription Revoke a consent granted for one Property. Only property owner can access this list.
     *
     * @apiVersion 0.1.0
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiParam {String} thingId Id of the Thing containing the Property.
     * @apiParam {String} propertyId Id of the Property.
     * @apiParam {String} consentId Id of the Consent to delete.
     **/
    this.router.delete(
      "/:propertyId/consents/:consentId",
      [
        introspectToken(["dcd:properties", "dcd:consents"]),
        checkPolicy("delete"),
      ],
      this.controller.revokeConsent
    );

    /**
     * @api {post} /things/:thingId/properties/:propertyId/consents Grant a consent
     * @apiGroup Property
     * @apiDescription Grant a consent for one Property. Only property owner can access this list.
     *
     * @apiVersion 0.1.0
     *
     * @apiParam (Body) {Consent} consent Consent to grant as JSON.
     * @apiParamExample {json} consent:
     *     {
     *       "subjects": ["dcd:persons:4baec95d-98cf-44a5-9c4d-08ef0d734d07", "dcd:team:4baec95d-98cf-44a5-9c4d-08ef0d734d07"],
     *       "actions": ["dcd:read"]
     *     }
     *
     * @apiHeader {String} Content-type application/json
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiParam {String} thingId Id of the Thing containing the Property.
     * @apiParam {String} propertyId Id of the Property.
     **/
    this.router.post(
      "/:propertyId/consents",
      [
        introspectToken(["dcd:properties", "dcd:consents"]),
        checkPolicy("create"),
      ],
      this.controller.grantConsent
    );
  }
}
