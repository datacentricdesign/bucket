import { Router } from "express";

import {
  introspectToken,
  introspectTokenWs,
} from "../middlewares/introspectToken";
import { checkPolicy, checkPolicyWs } from "../middlewares/checkPolicy";

import PropertyController from "./PropertyController";
import { DCDError, Property } from "@datacentricdesign/types";
import path = require("path");
import multer = require("multer");

export const PropertyRouter = Router({ mergeParams: true });

import { Log } from "../../Logger";
import config from "../../config";

// Set The Storage Engine
const storage = multer.diskStorage({
  destination: config.hostDataFolder + "/files/",
  filename: function (req, file, cb) {
    Log.debug(file);
    const thingId = req.params.thingId;
    const propertyId = req.params.propertyId;
    // Extract timestamp
    Log.debug(req.body.property);
    if (req.body.property !== undefined) {
      const body = JSON.parse(req.body.property);
      const timestamp = body.values[0][0];
      cb(
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
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1000000000 },
  fileFilter: function (req, file, cb) {
    checkFileType(req, file, cb);
  },
});

// Check File Type
async function checkFileType(req, file, cb) {
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
  const property: Property =
    await PropertyController.propertyService.getOnePropertyById(
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
        "Error: field " + file.fieldname + " is not matching any dimension ID."
      )
    );
  }
}

/**
 * @api {get} /things/:thingId/properties List
 * @apiGroup Property
 * @apiDescription Get Properties of a Thing.
 *
 * @apiVersion 0.1.1
 *
 * @apiHeader {String} Authorization TOKEN ID
 *
 * @apiSuccess {Property[]} properties The retrieved Properties
 **/
PropertyRouter.get(
  "/",
  [introspectToken(["dcd:properties"]), checkPolicy("read")],
  PropertyController.getProperties
);

/**
 * @api {get} /things/:thingId/properties/:propertyId Read
 * @apiGroup Property
 * @apiDescription Get one Property.
 *
 * @apiVersion 0.1.1
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
PropertyRouter.get(
  "/:propertyId",
  [introspectToken(["dcd:properties"]), checkPolicy("read")],
  PropertyController.getOnePropertyById
);

/**
 * @api {get} /things/:thingId/properties/:propertyId/dimensions/:dimensionId/timestamp/:timestamp Download media value
 * @apiGroup Property
 * @apiDescription Get the media associated to a dimension's timestamp.
 *
 * @apiVersion 0.1.0
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
PropertyRouter.get(
  "/:propertyId/dimensions/:dimensionId/timestamp/:timestamp",
  [introspectToken(["dcd:properties"]), checkPolicy("read")],
  PropertyController.getPropertyMediaValue
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
PropertyRouter.ws(
  "/:propertyId/stream",
  introspectTokenWs(["dcd:properties"]),
  checkPolicyWs("read"),
  PropertyController.streamMedia
);

/**
 * @api {post} /things/:thingId/properties Create
 * @apiGroup Property
 * @apiDescription Create a Property.
 *
 * @apiVersion 0.1.1
 *
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
PropertyRouter.post(
  "/",
  [introspectToken([]), checkPolicy("create")],
  PropertyController.createNewProperty
);

/**
 * @api {patch} /things/:thingId/properties/:propertyId Update
 * @apiGroup Property
 * @apiDescription Edit one Property to change its name or description.
 *
 * @apiVersion 0.1.1
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
PropertyRouter.patch(
  "/:propertyId",
  [introspectToken(["dcd:properties"]), checkPolicy("update")],
  PropertyController.editProperty
);

/**
 * @api {put} /things/:thingId/properties/:propertyId Update Values
 * @apiGroup Property
 * @apiDescription Update values of a Property.
 *
 * @apiVersion 0.1.1
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
PropertyRouter.put(
  "/:propertyId",
  [introspectToken(["dcd:properties"]), checkPolicy("update")],
  upload.any(),
  PropertyController.updatePropertyValues
);

/**
 * @api {delete} /things/:thingId/properties/:propertyId Delete
 * @apiGroup Property
 * @apiDescription Delete one Property.
 *
 * @apiVersion 0.1.1
 *
 * @apiHeader {String} Authorization TOKEN ID
 *
 * @apiParam {String} thingId Id of the Thing containing the Property to delete.
 * @apiParam {String} propertyId Id of the Property to delete.
 **/
PropertyRouter.delete(
  "/:propertyId",
  [introspectToken(["dcd:properties"]), checkPolicy("delete")],
  PropertyController.deleteOneProperty
);

PropertyRouter.get(
  "/:propertyId/count",
  [introspectToken(["dcd:properties"]), checkPolicy("read")],
  PropertyController.countDataPoints
);

PropertyRouter.get(
  "/:propertyId/last",
  [introspectToken(["dcd:properties"]), checkPolicy("read")],
  PropertyController.lastDataPoints
);

/**
 * @api {get} /things/:thingId/properties/:propertyId/consents List consents
 * @apiGroup Property
 * @apiDescription List consents granted for one Property. Only property owner can access this list.
 *
 * @apiVersion 0.1.1
 *
 * @apiHeader {String} Authorization TOKEN ID
 *
 * @apiParam {String} thingId Id of the Thing containing the Property.
 * @apiParam {String} propertyId Id of the Property to list consents from.
 **/
PropertyRouter.get(
  "/:propertyId/consents",
  [introspectToken(["dcd:properties", "dcd:consents"]), checkPolicy("list")],
  PropertyController.listConsents
);

/**
 * @api {delete} /things/:thingId/properties/:propertyId/consents Revoke a consent
 * @apiGroup Property
 * @apiDescription Revoke a consent granted for one Property. Only property owner can access this list.
 *
 * @apiVersion 0.1.1
 *
 * @apiHeader {String} Authorization TOKEN ID
 *
 * @apiParam {String} thingId Id of the Thing containing the Property.
 * @apiParam {String} propertyId Id of the Property.
 * @apiParam {String} consentId Id of the Consent to delete.
 **/
PropertyRouter.delete(
  "/:propertyId/consents/:consentId",
  [introspectToken(["dcd:properties", "dcd:consents"]), checkPolicy("delete")],
  PropertyController.revokeConsent
);

/**
 * @api {post} /things/:thingId/properties/:propertyId/consents Grant a consent
 * @apiGroup Property
 * @apiDescription Grant a consent for one Property. Only property owner can access this list.
 *
 * @apiVersion 0.1.1
 *
 * @apiParam (Body) {Consent} consent Consent to grant as JSON.
 * @apiParamExample {json} consent:
 *     {
 *       "subjects": ["dcd:persons:4baec95d-98cf-44a5-9c4d-08ef0d734d07", "dcd:team:4baec95d-98cf-44a5-9c4d-08ef0d734d07"],
 *       "actions": ["dcd:read"]
 *     }
 *
 * @apiHeader {String} Content-type application/json
 *
 * @apiHeader {String} Authorization TOKEN ID
 *
 * @apiParam {String} thingId Id of the Thing containing the Property.
 * @apiParam {String} propertyId Id of the Property.
 **/
PropertyRouter.post(
  "/:propertyId/consents",
  [introspectToken(["dcd:properties", "dcd:consents"]), checkPolicy("create")],
  PropertyController.grantConsent
);
