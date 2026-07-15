'use strict'

const _ = require('lodash')

const getIntoDate = ({fields = [], object = {}}) => {
    return _.pick(object, fields)
}

const getValue = (key, object = {}) => {
    return _.get(object, [key])
}
const find = (object,key) => {
    return _.find(object, [key])
}
module.exports = {
    getIntoDate,
    getValue,
    find
}