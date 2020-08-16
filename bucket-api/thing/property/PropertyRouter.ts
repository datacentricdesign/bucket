import { Router } from "express";

import { introspectToken } from "../middlewares/introspectToken";
import { checkPolicy } from "../middlewares/checkPolicy";

import PropertyController from "./PropertyController";

export const PropertyRouter = Router({mergeParams: true});


/**
     * @api {get} /things/:thingId/properties List
     * @apiGroup Property
     * @apiDescription Get Properties of a Thing.
     *
     * @apiVersion 0.1.0
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiSuccess {Property[]} properties The retrieved Properties
**/
PropertyRouter.get(
     "/",
     [introspectToken(['dcd:properties']), checkPolicy('list')],
     PropertyController.getPropertiesOfAThing);

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
PropertyRouter.get(
     "/:propertyId",
     [introspectToken(['dcd:properties']), checkPolicy('read')],
     PropertyController.getOnePropertyById
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
     * @apiParam (Body) {Property} property Property to create as JSON.
     * @apiParamExample {json} property:
     *     {
     *       "name": "My Property",
     *       "description": "A description of my property.",
     *       "type": "PROPERTY_TYPE"
     *     }
     *
     * @apiHeader {String} Content-type application/json
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiSuccess {object} interaction The created Property
     */
PropertyRouter.post(
     "/",
     [introspectToken([]), checkPolicy('create')],
     PropertyController.createNewProperty);

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
PropertyRouter.patch(
     "/:propertyId",
     [introspectToken(['dcd:properties']), checkPolicy('update')],
     PropertyController.editProperty
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
PropertyRouter.put(
     "/:propertyId",
     [introspectToken(['dcd:properties']), checkPolicy('update')],
     PropertyController.updatePropertyValues
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
PropertyRouter.delete(
     "/:propertyId",
     [introspectToken(['dcd:properties']), checkPolicy('delete')],
     PropertyController.deleteOneProperty
);

PropertyRouter.get(
     "/:propertyId/count",
     [introspectToken(['dcd:properties']), checkPolicy('read')],
     PropertyController.countDataPoints
);

PropertyRouter.get(
     "/:propertyId/last",
     [introspectToken(['dcd:properties']), checkPolicy('read')],
     PropertyController.lastDataPoints
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
PropertyRouter.get(
     "/:propertyId/consents",
     [introspectToken(['dcd:properties', 'dcd:consents']), checkPolicy('list')],
     PropertyController.listConsents
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
PropertyRouter.delete(
     "/:propertyId/consents/:consentId",
     [introspectToken(['dcd:properties', 'dcd:consents']), checkPolicy('delete')],
     PropertyController.revokeConsent
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
PropertyRouter.post(
     "/:propertyId/consents",
     [introspectToken(['dcd:properties', 'dcd:consents']), checkPolicy('create')],
     PropertyController.grantConsent
);