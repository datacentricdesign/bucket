import { Router } from "express";

import DPiController from "./DPiController";
import { introspectToken } from "../middlewares/introspectToken";
import { checkPolicy } from "../middlewares/checkPolicy";

export const DPiRouter = Router();

/**
 * @api {get} /
 * @apiGroup DPi
 * @apiDescription Get DPi Image
 *
 * @apiVersion 0.0.1
 *
 * @apiSuccess {DPi}
**/
DPiRouter.get(
    "/",
    [introspectToken(['dcd:things']), checkPolicy('read')],
    DPiController.getOneDPIImage);

/**
 * @api {post} /
 * @apiGroup DPi
 * @apiDescription Generate a new DPi Image
 *
 * @apiVersion 0.1.0
 *
 * @apiParam (Body) {DTODPi}
 * @apiHeader {String} Content-type application/json
 *
 * @apiSuccess {DPi}
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
 * @apiVersion 0.1.0
 *
 * @apiSuccess {DPi}
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
 * @apiVersion 0.1.0
 *
 * @apiSuccess {DPi}
 **/
DPiRouter.get(
    "/cancel",
    [introspectToken(['dcd:things']), checkPolicy('update')],
    DPiController.cancelDPiImageGeneration);