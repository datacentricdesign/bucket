import { Router } from "express";

import GrafanaController from "./GrafanaController";
import { introspectToken } from "../middlewares/introspectToken";
import { checkPolicy } from "../middlewares/checkPolicy";

export const GrafanaRouter = Router({mergeParams: true});

/**
 * @api {post} /
 * @apiGroup Grafana
 * @apiDescription Create Grafana dashboard for a Thing
 *
 * @apiVersion 0.0.1
**/
GrafanaRouter.post(
    "/",
    [introspectToken(['dcd:things'])],
    GrafanaController.createGrafanaDashboard);


/**
 * @api {get} /user
 * @apiGroup Grafana
 * @apiDescription Get user id on Grafana
 *
 * @apiVersion 0.0.1
**/
GrafanaRouter.get(
    "/user",
    [introspectToken(['dcd:things'])],
    GrafanaController.getGrafanaUserId);