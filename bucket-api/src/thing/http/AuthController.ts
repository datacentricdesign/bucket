import {Request, Response, Router, NextFunction} from "express";
import {getRepository, DeleteResult} from "typeorm";
import {validate} from "class-validator";

import {Thing} from "../Thing";
import {AuthService} from "../services/AuthService"
import { DCDError } from "@datacentricdesign/types";
import { PolicyService } from "../services/PolicyService";

export class AuthController {

    static authService = new AuthService();
    static policyService = new PolicyService();

}