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
     [introspectToken(['dcd:properties']), checkPolicy('properties', 'list')],
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
     [introspectToken(['dcd:properties']), checkPolicy('properties', 'read')],
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
     [introspectToken([]), checkPolicy('properties', 'create')],
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
     [introspectToken(['dcd:properties']), checkPolicy('properties', 'update')],
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
     [introspectToken(['dcd:properties']), checkPolicy('properties', 'update')],
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
     [introspectToken(['dcd:properties']), checkPolicy('properties', 'delete')],
     PropertyController.deleteOneProperty
);

PropertyRouter.get(
     "/:propertyId/count",
     [introspectToken(['dcd:properties']), checkPolicy('properties', 'read')],
     PropertyController.countDataPoints
);

PropertyRouter.get(
     "/:propertyId/last",
     [introspectToken(['dcd:properties']), checkPolicy('properties', 'read')],
     PropertyController.lastDataPoints
);