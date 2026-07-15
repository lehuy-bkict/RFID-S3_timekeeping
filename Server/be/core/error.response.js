'use strict'

const {ERROR} = require('../commons/enum');

const StatusCode = {
    FORBIDDEN: 403,
    CONFLICT: 409
}

const ReasonStatusCode = {
    FORBIDDEN: 'Bad request error',
    CONFLICT: 'Conflict error'
}

class ErrorResponse extends Error{
    constructor(error = ERROR, message, status){
        this.error = error,
        super(message),
        this.status = status
    }
}

class ConflictRequestError extends ErrorResponse {
    constructor({error = ERROR, message = ReasonStatusCode.CONFLICT, statusCode = StatusCode.CONFLICT}) {
        super(error, message, statusCode)
    }
}

class BadRequestError extends ErrorResponse {
    constructor({error = ERROR, message = ReasonStatusCode.FORBIDDEN, statusCode = StatusCode.FORBIDDEN}) {
        super(error, message, statusCode)
    }
}

module.exports = {
    ConflictRequestError,
    BadRequestError
}