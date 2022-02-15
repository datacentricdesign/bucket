import { Router } from "express";

import DPiController from "./DPiController";
import { AuthController } from "../../auth/AuthController";
import { PolicyController } from "../../policy/PolicyController";
import { Application } from "express-serve-static-core";

export class DPiRouter {
  private router: Router;

  private controller: DPiController;
  private authController: AuthController;
  private policyController: PolicyController;

  private app: Application;

  constructor(app: Application) {
    this.app = app;
    this.router = Router({ mergeParams: true });
    this.controller = DPiController.getInstance();
    this.authController = AuthController.getInstance();
    this.policyController = PolicyController.getInstance();
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
     * @apiVersion 0.1.4
     **/
    this.router.get(
      "/",
      [this.authController.authenticate(["dcd:things"])],
      this.controller.getOneDPIImage.bind(this.controller)
    );

    /**
     * @api {post} /
     * @apiGroup DPi
     * @apiDescription Generate a new DPi Image
     *
     * @apiVersion 0.1.4
     *
     * @apiParam (Body) {DTODPi} details of the DPi image
     * @apiHeader {String} Content-type application/json
     **/
    this.router.post(
      "/",
      [
        this.authController.authenticate(["dcd:things"]),
        this.policyController.checkPolicy("update"),
      ],
      this.controller.generateNewDPIImage.bind(this.controller)
    );

    /**
     * @api {delete} /dpi/:dpiId Delete
     * @apiGroup DPi
     * @apiDescription Delete DPi Image
     *
     * @apiVersion 0.1.4
     **/
    this.router.delete(
      "/",
      [
        this.authController.authenticate(["dcd:things"]),
        this.policyController.checkPolicy("update"),
      ],
      this.controller.deleteDPiImage.bind(this.controller)
    );

    /**
     * @api {delete} /dpi/:dpiId Cancel
     * @apiGroup DPi
     * @apiDescription Cancel DPi Image Generation
     *
     * @apiVersion 0.1.4
     **/
    this.router.get(
      "/cancel",
      [
        this.authController.authenticate(["dcd:things"]),
        this.policyController.checkPolicy("update"),
      ],
      this.controller.cancelDPiImageGeneration.bind(this.controller)
    );
  }
}
