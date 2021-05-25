import { Router } from "express";

import { introspectToken } from "../middlewares/introspectToken";
import { checkPolicy } from "../middlewares/checkPolicy";
import { DPiController } from "./DPiController";

export class DPiRouter {
  private router: Router;

  private controller: DPiController;

  constructor() {
    this.router = Router({ mergeParams: true });
    this.controller = new DPiController();
    this.setRoutes();
  }

  getRouter(): Router {
    return this.router;
  }

  getController(): DPiController {
    return this.controller;
  }

  setRoutes(): void {
    /**
     * @api {get} /
     * @apiGroup DPi
     * @apiDescription Get DPi Image
     *
     * @apiVersion 0.0.1
     * */
    this.router.get(
      "/",
      [introspectToken(["dcd:things"])],
      this.controller.getOneDPIImage
    );

    /**
     * @api {post} /
     * @apiGroup DPi
     * @apiDescription Generate a new DPi Image
     *
     * @apiVersion 0.1.0
     *
     * @apiParam (Body) {DTODPi} details of the DPi image
     * @apiHeader {String} Content-type application/json
     * */
    this.router.post(
      "/",
      [introspectToken(["dcd:things"]), checkPolicy("update")],
      this.controller.generateNewDPIImage
    );

    /**
     * @api {delete} /dpi/:dpiId Delete
     * @apiGroup DPi
     * @apiDescription Delete DPi Image
     *
     * @apiVersion 0.1.0
     * */
    this.router.delete(
      "/",
      [introspectToken(["dcd:things"]), checkPolicy("update")],
      this.controller.deleteDPiImage
    );

    /**
     * @api {delete} /dpi/:dpiId Cancel
     * @apiGroup DPi
     * @apiDescription Cancel DPi Image Generation
     *
     * @apiVersion 0.1.0
     * */
    this.router.get(
      "/cancel",
      [introspectToken(["dcd:things"]), checkPolicy("update")],
      this.controller.cancelDPiImageGeneration
    );
  }
}
