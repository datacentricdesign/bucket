import { Router } from "express";

import { introspectToken } from "../../middlewares/introspectToken";
import { PropertyTypeController } from "./PropertyTypeController";

export class PropertyTypeRouter {
  private router: Router;

  private controller: PropertyTypeController;

  constructor() {
    this.router = Router({ mergeParams: true });
    this.controller = new PropertyTypeController();
    this.setRoutes();
  }

  getRouter(): Router {
    return this.router;
  }

  setRoutes(): void {
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
     *
     */
    this.router.get(
      "/",
      [introspectToken(["dcd:types"])],
      this.controller.getPropertyTypes
    );

    /**
     * @api {post} /types Create
     * @apiGroup PropertyType
     * @apiDescription Create a Property Types.
     *
     * @apiVersion 0.1.0
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     */
    this.router.post(
      "/",
      [introspectToken(["dcd:types"])],
      this.controller.createOnePropertyType
    );

    /**
     * @api {post} /types Delete
     * @apiGroup PropertyType
     * @apiDescription Delete a Property Type by id.
     *
     * @apiVersion 0.1.0
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     */
    this.router.delete(
      "/:propertyTypeId",
      [introspectToken(["dcd:types"])],
      this.controller.deleteOnePropertyTypeById
    );
  }
}
