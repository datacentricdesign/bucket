import { Application, Router } from "express";

import { GrafanaController } from "./GrafanaController";
import { AuthController } from "../../auth/AuthController";

export class GrafanaRouter {
  private router: Router;

  private controller: GrafanaController;
  private authController: AuthController;

  private app: Application;

  constructor(app: Application) {
    this.app = app;
    this.router = Router({ mergeParams: true });
    this.controller = new GrafanaController();
    this.authController = AuthController.getInstance();
    this.setRoutes();
  }

  getRouter(): Router {
    return this.router;
  }

  getController(): GrafanaController {
    return this.controller;
  }

  setRoutes(): void {
    /**
    * @api {post} /
    * @apiGroup Grafana
    * @apiDescription Create Grafana dashboard for a Thing
    *
    * @apiVersion 0.0.1
    **/
    this.router.post(
      "/",
      [this.authController.authenticate(["dcd:things"])],
      this.controller.createGrafanaDashboard.bind(this.controller)
    );

    /**
     * @api {get} /user
     * @apiGroup Grafana
     * @apiDescription Get user id on Grafana
     *
     * @apiVersion 0.0.1
     **/
    this.router.get(
      "/user",
      [this.authController.authenticate(["dcd:things"])],
      this.controller.getGrafanaUserId.bind(this.controller)
    );

  }

}