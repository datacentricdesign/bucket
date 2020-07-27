/**
 * This class help built complete error messages.
 * @param {int} code Internal DCD Hub error code
 * @param {string} hint Contextual message to supplement generic information
 */
export class DCDError extends Error {
    _requirements: string;
    _hint: string;
    _statusCode: number;

    name: string;
    errorCode: number;


    get requirements() {
        return this._requirements
    }
    get hint() {
        return this._hint
    }
    get statusCode() {
        return this._statusCode
    }

    constructor(code: number, hint: string) {
        super()

        this.errorCode = code
        this.name = 'DCD Hub Error'

        this._hint = ''
        if (hint !== undefined) {
            this._hint = hint
        }
        this._requirements = ''

        switch (this.errorCode) {
            case 400:
                this._statusCode = 400
                this.message = 'Information missing or malformed'
                this._requirements =
                    'Something is missing or malformed in body, query params or path params.'
                break
            case 4001:
                this._statusCode = 400
                this.message = 'Person information missing or malformed'
                this._requirements =
                    'Person information must be provided in JSON format and includes fields id, name and password.\n The password must be at least 8-character long.'
                break
            case 4002:
                this._statusCode = 400
                this.message = 'Person already existing'
                this._requirements = 'Person id must be unique.'
                break
            case 4003:
                this._statusCode = 400
                this.message = 'Thing information missing or malformed'
                this._requirements =
                    'Thing information must be provided in JSON format and includes fields name and type.'
                break
            case 4004:
                this._statusCode = 400
                this.message = 'Thing already existing'
                this._requirements = 'Thing id must be unique.'
                break
            case 4006:
                this._statusCode = 400
                this.message = 'DB duplicated entry'
                break
            case 4007:
                this._statusCode = 400
                this.message = 'Property information missing or malformed'
                this._requirements =
                    'Property information must be provided in JSON format and includes fields name and type.'
                break
            case 4008:
                this._statusCode = 400
                this.message = 'Interaction information missing or malformed'
                break
            case 4009:
                this._statusCode = 400
                this.message = 'Class information missing or malformed'
                break
            case 4031:
                this._statusCode = 403
                this.message =
                    'Access denied - Authentication information missing, malformed or invalid'
                this._requirements = 'You must provide a valid bearer token.'
                break
            case 404:
                this._statusCode = 404
                this.message = 'Resource not found'
                break
            case 4041:
                this._statusCode = 404
                this.message = 'Role not found'
                break
            case 4042:
                this._statusCode = 404
                this.message = 'File not found'
                break
            case 2001:
                this._statusCode = 200
                this.message = 'Nothing Changed'
                break
            default:
                this.errorCode = 500
                this._statusCode = 500
                this.message = 'Server error'
        }
    }
}