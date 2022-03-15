import * as expressWs from "express-ws";

import { AuthController } from "../../auth/AuthController";
import { PolicyController } from "../../policy/PolicyController";

import { PropertyController } from "./PropertyController";
import { DCDError, Property } from "@datacentricdesign/types";
import path = require("path");
import multer = require("multer");

import { Log } from "../../Logger";
import config from "../../config";
import { Request } from "express-serve-static-core";
import { PropertyService } from "./PropertyService";
import { Application, Router } from "express";
import { Router as WSRouter } from "express-ws";

export class PropertyRouter {
  private router: WSRouter;

  private controller: PropertyController;
  private policyController: PolicyController;
  private authController: AuthController;

  private propertyService: PropertyService;

  constructor(app: Application) {
    this.propertyService = PropertyService.getInstance();
    expressWs(app);
    this.router = Router({ mergeParams: true }) as WSRouter;
    this.controller = PropertyController.getInstance();
    this.policyController = PolicyController.getInstance();
    this.authController = AuthController.getInstance();
    this.setRoutes();
  }

  getRouter(): Router {
    return this.router;
  }

  getController(): PropertyController {
    return this.controller;
  }

  setRoutes(): void {
    /**
     * @api {get} /things/:thingId/properties List
     * @apiGroup Property
     * @apiDescription Get Properties of a Thing.
     *
     * @apiVersion 0.1.5
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiSuccess {Property[]} properties The retrieved Properties
     **/
    this.router.get(
      "/",
      [
        this.authController.authenticate(["dcd:properties"]),
        this.policyController.checkPolicy("read"),
      ],
      this.controller.getProperties.bind(this.controller)
    );

    /**
     * @api {get} /things/:thingId/properties/:propertyId Read
     * @apiGroup Property
     * @apiDescription Get one Property.
     *
     * @apiVersion 0.1.5
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiParam {String} thingId Id of the Thing containing the Property to read.
     * @apiParam {String} propertyId Id of the Property to read.
     *
     * @apiParam (Query) {Number} [from=0] The start time when fetching data of the property, epoch time in milliseconds
     * @apiParam (Query) {Number} [to=1626357490387] The start time when fetching data of the property, epoch time in milliseconds
     *
     * @apiSuccess {Property} property The retrieved Property
     **/
    this.router.get(
      "/:propertyId",
      [
        this.authController.authenticate(["dcd:properties"]),
        this.policyController.checkPolicy("read"),
      ],
      this.controller.getOnePropertyById.bind(this.controller)
    );

    /**
     * @api {get} /things/:thingId/properties/:propertyId/dimensions/:dimensionId/timestamp/:timestamp Download media value
     * @apiGroup Property
     * @apiDescription Get the media associated to a dimension's timestamp.
     *
     * @apiVersion 0.1.5
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiParam {String} thingId Id of the Thing containing the Property to read.
     * @apiParam {String} propertyId Id of the Property to read.
     * @apiParam {String} dimensionId Id of the Dimension to read.
     * @apiParam {String} timestamp Timestamp of the value.
     *
     * @apiSuccess {Property} property The retrieved Property
     **/
    this.router.get(
      "/:propertyId/dimensions/:dimensionId/timestamp/:timestamp",
      [
        this.authController.authenticate(["dcd:properties"]),
        this.policyController.checkPolicy("read"),
      ],
      this.controller.getPropertyMediaValue.bind(this.controller)
    );

    /**
     * @api {get} /things/:thingId/properties/:propertyId/stream
     * @apiGroup Property
     * @apiDescription Websocket to establish a WebRTC connection.
     *
     * @apiVersion 0.1.0
     *
     * @apiParam {String} thingId Id of the Thing containing the Property to stream.
     * @apiParam {String} propertyId Id of the Property to stream.
     *
     * @apiParam (Query) {String} authorization The access token.
     **/
    this.router.ws(
      "/:propertyId/stream",
      this.authController.authenticateWs(["dcd:properties"]),
      this.policyController.checkPolicyWs("read"),
      this.controller.streamMedia.bind(this.controller)
    );

    /**
     * @api {post} /things/:thingId/properties Create
     * @apiGroup Property
     * @apiDescription Create a Property.
     *
     * @apiVersion 0.1.5
     * @apiParam {String} thingId Id of the Thing to which we add the Property.
     *
     * @apiParam (Body) {Property} property Property to create as JSON.
     * @apiParamExample {json} property:
     *     {
     *       "name": "My Property",
     *       "description": "A description of my property.",
     *       "type": "PROPERTY_TYPE"
     *     }
     *
     * @apiHeader {String} Content-type application/json
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiSuccess {object} interaction The created Property
     */
    this.router.post(
      "/",
      [
        this.authController.authenticate([]),
        this.policyController.checkPolicy("create"),
      ],
      this.controller.createNewProperty.bind(this.controller)
    );

    /**
     * @api {patch} /things/:thingId/properties/:propertyId Update
     * @apiGroup Property
     * @apiDescription Edit one Property to change its name or description.
     *
     * @apiVersion 0.1.5
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiParam {String} thingId Id of the Thing containing the Property to update.
     * @apiParam {String} propertyId Id of the Property to update.
     *
     * @apiParam (Body) {Property} property Property to create as JSON.
     * @apiParamExample {json} property:
     *     {
     *       "name": "A new Property name",
     *       "description": "A new description of my property."
     *     }
     **/
    this.router.patch(
      "/:propertyId",
      [
        this.authController.authenticate(["dcd:properties"]),
        this.policyController.checkPolicy("update"),
      ],
      this.controller.editProperty.bind(this.controller)
    );

    /**
     * @api {put} /things/:thingId/properties/:propertyId Update Values
     * @apiGroup Property
     * @apiDescription Update values of a Property.
     *
     * @apiVersion 0.1.5
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiParam {String} thingId Id of the Thing containing the Property to update.
     * @apiParam {String} propertyId Id of the Property to update.
     *
     * @apiParam (Body) {Property} property with attribute 'values', an array of array [ [timestamp, val1, val2, val3], [timestamp, val1, val2, val3], ....]
     * @apiParamExample {json} property:
     *     {
     *       "values": [[1591868318000,0,1,2],[1591868318200,3,1,1]],
     *     }
     **/
    this.router.put(
      "/:propertyId",
      [
        this.authController.authenticate(["dcd:properties"]),
        this.policyController.checkPolicy("update"),
      ],
      this.upload.any(),
      this.controller.updatePropertyValues.bind(this.controller)
    );

    /**
     * @api {delete} /things/:thingId/properties/:propertyId Delete
     * @apiGroup Property
     * @apiDescription Delete one Property.
     *
     * @apiVersion 0.1.5
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiParam {String} thingId Id of the Thing containing the Property to delete.
     * @apiParam {String} propertyId Id of the Property to delete.
     **/
    this.router.delete(
      "/:propertyId",
      [
        this.authController.authenticate(["dcd:properties"]),
        this.policyController.checkPolicy("delete"),
      ],
      this.controller.deleteOneProperty.bind(this.controller)
    );

    /**
     * @api {delete} /things/:thingId/properties/:propertyId/timestamps Delete Timestamps
     * @apiGroup Property
     * @apiDescription Delete some data points of a property.
     *
     * @apiVersion 0.1.5
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiParam {String} thingId Id of the Thing containing the Property from where to delete data points.
     * @apiParam {String} propertyId Id of the Property from where to delete data points.
     * 
     * @apiParam (Body) {number[]} timestamps The array of timestamps to delete from a property
     **/
    this.router.delete(
      "/:propertyId/timestamps",
      [
        this.authController.authenticate(["dcd:properties"]),
        this.policyController.checkPolicy("delete"),
      ],
      this.controller.deleteDataPoints.bind(this.controller)
    );

    this.router.get(
      "/:propertyId/count",
      [
        this.authController.authenticate(["dcd:properties"]),
        this.policyController.checkPolicy("read"),
      ],
      this.controller.countDataPoints.bind(this.controller)
    );

    this.router.get(
      "/:propertyId/last",
      [
        this.authController.authenticate(["dcd:properties"]),
        this.policyController.checkPolicy("read"),
      ],
      this.controller.lastDataPoints.bind(this.controller)
    );

    /**
     * @api {get} /things/:thingId/properties/:propertyId/consents List consents
     * @apiGroup Property
     * @apiDescription List consents granted for one Property. Only property owner can access this list.
     *
     * @apiVersion 0.1.5
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiParam {String} thingId Id of the Thing containing the Property.
     * @apiParam {String} propertyId Id of the Property to list consents from.
     **/
    this.router.get(
      "/:propertyId/consents",
      [
        this.authController.authenticate(["dcd:properties", "dcd:consents"]),
        this.policyController.checkPolicy("list"),
      ],
      this.controller.listConsents.bind(this.controller)
    );

    /**
     * @api {delete} /things/:thingId/properties/:propertyId/consents Revoke a consent
     * @apiGroup Property
     * @apiDescription Revoke a consent granted for one Property. Only property owner can access this list.
     *
     * @apiVersion 0.1.5
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiParam {String} thingId Id of the Thing containing the Property.
     * @apiParam {String} propertyId Id of the Property.
     * @apiParam {String} consentId Id of the Consent to delete.
     **/
    this.router.delete(
      "/:propertyId/consents/:consentId",
      [
        this.authController.authenticate(["dcd:properties", "dcd:consents"]),
        this.policyController.checkPolicy("delete"),
      ],
      this.controller.revokeConsent.bind(this.controller)
    );

    /**
     * @api {post} /things/:thingId/properties/:propertyId/consents Grant a consent
     * @apiGroup Property
     * @apiDescription Grant a consent for one Property. Only property owner can access this list.
     *
     * @apiVersion 0.1.5
     *
     * @apiParam (Body) {Consent} consent Consent to grant as JSON.
     * @apiParamExample {json} consent:
     *     {
     *       "subjects": ["dcd:persons:4baec95d-98cf-44a5-9c4d-08ef0d734d07", "dcd:team:4baec95d-98cf-44a5-9c4d-08ef0d734d07"],
     *       "actions": ["dcd:actions:read"]
     *     }
     *
     * @apiHeader {String} Content-type application/json
     *
     * @apiHeader {String} Authorization TOKEN ID
     *
     * @apiParam {String} thingId Id of the Thing containing the Property.
     * @apiParam {String} propertyId Id of the Property.
     **/
    this.router.post(
      "/:propertyId/consents",
      [
        this.authController.authenticate(["dcd:properties", "dcd:consents"]),
        this.policyController.checkPolicy("create"),
      ],
      this.controller.grantConsent.bind(this.controller)
    );
  }

  // Check File Type
  async checkFileType(
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ): Promise<void> {
    // Get the ID from the url
    const thingId = req.params.thingId;
    const propertyId = req.params.propertyId;
    // Check ext
    const extensionName = path.extname(file.originalname).toLowerCase();

    if (file.fieldname === "csv") {
      Log.debug(extensionName);
      if (extensionName === ".csv" && file.mimetype === "text/csv") {
        return cb(null, true);
      } else {
        return cb(
          new DCDError(
            400,
            "Error: the file extension must be '.csv' and mimetype 'text/csv'."
          )
        );
      }
    }

    // get property details with
    const property: Property = await this.propertyService.getOnePropertyById(
      thingId,
      propertyId
    );
    // Double-check the property is actually part of this thing
    if (property === undefined) {
      // If not found, send a 404 response
      return cb(new DCDError(404, "Property not found in the thing."));
    }

    let dimension = null;
    for (let i = 0; i < property.type.dimensions.length; i++) {
      if (property.type.dimensions[i].id === file.fieldname) {
        dimension = property.type.dimensions[i];
      }
    }
    Log.debug(dimension);

    if (dimension !== null) {
      if (dimension.unit === extensionName) {
        console.log(dimension.type);
        console.log(file.mimetype);
        if (dimension.type === file.mimetype) {
          return cb(null, true);
        } else {
          cb(
            new DCDError(
              400,
              "Error: File in field " +
              file.fieldname +
              " must have mime type " +
              file.mimetype +
              "."
            )
          );
        }
      } else {
        cb(
          new DCDError(
            400,
            "Error: File in field " +
            file.fieldname +
            " must have extension " +
            dimension.unit +
            "."
          )
        );
      }
    } else {
      cb(
        new DCDError(
          400,
          "Error: field " +
          file.fieldname +
          " is not matching any dimension ID."
        )
      );
    }
  }

  upload = multer({
    storage: storage,
    limits: { fileSize: 1000000000 },
    fileFilter: (
      request: Request,
      file: Express.Multer.File,
      cb: multer.FileFilterCallback
    ) => {
      this.checkFileType(request, file, cb);
    },
  });
}

// Set The Storage Engine
const storage = multer.diskStorage({
  destination: config.hostDataFolder + "/files/",
  filename: function (req, file, cb) {
    try {
      Log.debug(file);
      const thingId = req.params.thingId;
      const propertyId = req.params.propertyId;
      // Extract timestamp
      Log.debug(req.body);
      if (req.body.property !== undefined) {
        try {
          const body = JSON.parse(req.body.property);
          // Extract timestamp from the file name
          const timestamp = parseInt(file.originalname.toLowerCase().split(path.extname(file.originalname).toLowerCase())[0]);
          Log.debug(timestamp)
          for (let i = 0; i < body.values.length; i++) {
            // search for this timestamp in the submitted values
            if (body.values[i][0] === timestamp) {
              return cb(
                null,
                thingId +
                "-" +
                propertyId +
                "-" +
                timestamp +
                "#" +
                file.fieldname +
                path.extname(file.originalname).toLowerCase()
              );
            }
          }
          cb(
            new DCDError(
              400,
              "File ignored, no corresponding timestamp in the submitted values."
            ),
            file.filename
          );
        } catch {
          cb(
            new DCDError(
              400,
              "Could not parse JSON content."
            ),
            file.filename
          );
        }
      } else {
        if (file.fieldname === "csv") {
          cb(null, thingId + "-" + propertyId + ".csv");
        } else {
          cb(
            new DCDError(
              400,
              "Requests has no values nor 'csv' field containing a CSV file."
            ),
            file.filename
          );
        }
      }
    } catch (error) {
      cb(error, file.filename);
    }
  },
});
