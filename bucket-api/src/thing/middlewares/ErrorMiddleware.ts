import { NextFunction, Request, Response } from 'express';
import { DCDError } from '@datacentricdesign/types';
import { envConfig } from '../../config/envConfig';

export default function errorMiddleware(error: DCDError, request: Request, response: Response, next: NextFunction) {
    const status = error._statusCode || 500;
    const message = error.message || 'Something went wrong';
    console.debug(JSON.stringify({
        status,
        message,
        name: error.name,
        hint: error._hint,
        requirements: error._requirements,
        stack: error.stack,
        code: error.errorCode,
    }))
    if (envConfig.env === 'development') {
        return response.status(status).send({
            status,
            message,
            name: error.name,
            hint: error._hint,
            requirements: error._requirements,
            stack: error.stack,
            code: error.errorCode,
        })
    }
    response.status(status).send({
        status,
        message,
        name: error.name,
        hint: error._hint,
        requirements: error._requirements
    })
}