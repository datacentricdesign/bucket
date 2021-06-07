import { Router } from "express";

import DPiController from "./DPiController";
import { introspectToken } from "../middlewares/introspectToken";
import { checkPolicy } from "../middlewares/checkPolicy";

export const DPiRouter = Router({mergeParams: true});

/**
 * @api {get} /
 * @apiGroup DPi
 * @apiDescription Get DPi Image
 *
 * @apiVersion 0.1.1
**/
DPiRouter.get(
    "/",
    [introspectToken(['dcd:things'])],
    DPiController.getOneDPIImage);

/**
 * @api {post} /
 * @apiGroup DPi
 * @apiDescription Generate a new DPi Image
 *
 * @apiVersion 0.1.1
 *
 * @apiParam (Body) {DTODPi} details of the DPi image
 * @apiHeader {String} Content-type application/json
 **/
DPiRouter.post(
    "/",
    [introspectToken(['dcd:things']), checkPolicy('update')],
    DPiController.generateNewDPIImage);

/**
 * @api {delete} /dpi/:dpiId Delete
 * @apiGroup DPi
 * @apiDescription Delete DPi Image
 *
 * @apiVersion 0.1.1
 **/
DPiRouter.delete(
    "/",
    [introspectToken(['dcd:things']), checkPolicy('update')],
    DPiController.deleteDPiImage);

/**
 * @api {delete} /dpi/:dpiId Cancel
 * @apiGroup DPi
 * @apiDescription Cancel DPi Image Generation
 *
 * @apiVersion 0.1.1
 **/
DPiRouter.get(
    "/cancel",
    [introspectToken(['dcd:things']), checkPolicy('update')],
    DPiController.cancelDPiImageGeneration);