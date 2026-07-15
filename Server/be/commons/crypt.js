'use strict'

let bcrypt = require('bcrypt')

const salt = 12

module.exports.Encrypt = (hashString) => {
    return bcrypt.hashSync(hashString, salt)
}

module.exports.Compare = (hashString, cryptString) => {
    if (!hashString || !cryptString){
        return false
    }
    return bcrypt.compareSync(hashString, cryptString)
}