import { Router } from "express";

import { introspectToken } from "../middlewares/introspectToken";
import { GrafanaController } from "./GrafanaController";

export class GrafanaRouter {
  private router: Router;

  private controller: GrafanaController;

  constructor() {
    this.router = Router({ mergeParams: true });
    this.controller = new GrafanaController();
    this.setRoutes();
  }

  getRouter(): Router {
    return this.router;
  }

  setRoutes(): void {
    /**
     * @api {post} /
     * @apiGroup Grafana
     * @apiDescription Create Grafana dashboard for a Thing
     *
     * @apiVersion 0.0.1
     *
     */
    this.router.post(
      "/",
      [introspectToken(["dcd:things"])],
      this.controller.createGrafanaDashboard
    );

    /**
     * @api {get} /user
     * @apiGroup Grafana
     * @apiDescription Get user id on Grafana
     *
     * @apiVersion 0.0.1
     *
     */
    this.router.get(
      "/user",
      [introspectToken(["dcd:things"])],
      this.controller.getGrafanaUserId
    );
  }
}
