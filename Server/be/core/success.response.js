'use strict'

const {SUCCESS} = require('../commons/enum');

const StatusCode = {
    OK: 200,
    CREATED: 201
}

const ReasonStatusCode = {
    OK: 'Success',
    CREATED: 'Created!'
}

class SuccessResponse {
    constructor(error = SUCCESS, message, statusCode = StatusCode.OK, reasonStatusCode = ReasonStatusCode.OK, metadata = {}) {
        this.error = error
        this.message = !message ? reasonStatusCode : message,
        this.status =  statusCode,
        this.metadata = metadata
    }
    send(res, headers = {}) {
        return res.status(this.status).json(this)
    }
}

class OK extends SuccessResponse {
    constructor({error = SUCCESS, message, statusCode = StatusCode.OK, reasonStatusCode = ReasonStatusCode.OK, metadata = {}}) {
        super(error, message, statusCode, reasonStatusCode, metadata)
    }
}

class CREATED extends SuccessResponse {
    constructor({error = SUCCESS, message, statusCode = StatusCode.CREATED, reasonStatusCode = ReasonStatusCode.CREATED, metadata = {}, options = {}}) {
        super(error, message, statusCode, reasonStatusCode, metadata)
        this.options = options
    }
}

class ERROR extends SuccessResponse {
    constructor({error = SUCCESS, message, statusCode = StatusCode.OK, reasonStatusCode = ReasonStatusCode.OK, metadata = {}}) {
        super(error, message, statusCode, reasonStatusCode, metadata)
    }
}
module.exports = {
    OK, CREATED,ERROR
}
