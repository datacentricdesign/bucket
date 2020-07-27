import { Router } from "express";

import { introspectToken } from "../../middlewares/introspectToken";
import { checkPolicy } from "../../middlewares/checkPolicy";

import PropertyTypeController from "./PropertyTypeController";

export const PropertyTypeRouter = Router({mergeParams: true});


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
     [introspectToken(['dcd:types']), checkPolicy('types', 'list')],
     PropertyTypeController.getPropertyTypes);
