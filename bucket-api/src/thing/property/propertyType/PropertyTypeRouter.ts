import { Router } from "express";

import { introspectToken } from "../../middlewares/introspectToken";
import { checkPolicy } from "../../middlewares/checkPolicy";

import PropertyTypeController from "./PropertyTypeController";

export const PropertyTypeRouter = Router({ mergeParams: true });


/**
     * @api {get} /types List
     * @apiGroup PropertyType
     * @apiDescription Get Property Types.
     *
     * @apiVersion 0.1.0
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiSuccess {PropertyType[]} properties The retrieved Properties
**/
PropertyTypeRouter.get(
     "/",
     [introspectToken(['dcd:types'])],
     PropertyTypeController.getPropertyTypes);

/**
* @api {post} /types Create
* @apiGroup PropertyType
* @apiDescription Create a Property Types.
*
* @apiVersion 0.1.0
*
* @apiHeader {String} Authorization TOKEN ID
**/
PropertyTypeRouter.post(
     "/",
     [introspectToken(['dcd:types'])],
     PropertyTypeController.createOnePropertyType);

/**
* @api {post} /types Delete
* @apiGroup PropertyType
* @apiDescription Delete a Property Type by id.
*
* @apiVersion 0.1.0
*
* @apiHeader {String} Authorization TOKEN ID
**/
PropertyTypeRouter.delete(
     "/:propertyTypeId",
     [introspectToken(['dcd:types'])],
     PropertyTypeController.deleteOnePropertyTypeById);