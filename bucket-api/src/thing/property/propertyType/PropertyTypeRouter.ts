import { Router } from "express";
import { Application } from "express-serve-static-core";

import { AuthController } from "../../../auth/AuthController";

import PropertyTypeController from "./PropertyTypeController";

export class PropertyTypeRouter {
  private router: Router;

  private controller: PropertyTypeController;
  private authController: AuthController;

  private app: Application;

  constructor(app: Application) {
    this.app = app;
    this.router = Router({ mergeParams: true });
    this.controller = new PropertyTypeController();
    this.authController = AuthController.getInstance();
    this.setRoutes();
  }

  getRouter(): Router {
    return this.router;
  }

  getController(): PropertyTypeController {
    return this.controller;
  }

  setRoutes(): void {
    /**
     * @api {get} /types List
     * @apiGroup PropertyType
     * @apiDescription Get Property Types.
     *
     * @apiVersion 0.1.4
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiSuccess {PropertyType[]} properties The retrieved Properties
     **/
    this.router.get(
      "/",
      [this.authController.authenticate(["dcd:types"])],
      this.controller.getPropertyTypes.bind(this.controller)
    );

    /**
     * @api {post} /types Create
     * @apiGroup PropertyType
     * @apiDescription Create a Property Types.
     *
     * @apiVersion 0.1.4
     *
     * @apiHeader {String} Authorization TOKEN ID
     **/
    this.router.post(
      "/",
      [this.authController.authenticate(["dcd:types"])],
      this.controller.createOnePropertyType.bind(this.controller)
    );

    /**
     * @api {post} /types Delete
     * @apiGroup PropertyType
     * @apiDescription Delete a Property Type by id.
     *
     * @apiVersion 0.1.4
     *
     * @apiHeader {String} Authorization TOKEN ID
     **/
    this.router.delete(
      "/:propertyTypeId",
      [this.authController.authenticate(["dcd:types"])],
      this.controller.deleteOnePropertyTypeById.bind(this.controller)
    );
  }
}
