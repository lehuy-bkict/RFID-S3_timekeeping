'use strict';

const { Types, Schema, model } = require('mongoose');

const InfoCheckInOutSchema = new Schema({
    _id: {
        type: Types.ObjectId,
        default: () => new Types.ObjectId()
    },
    cardNumber: {
        type: String,
        trim: true
    },
    userName: {
        type: String,
        default: 'client',
        trim: true
    },
    verificationStatus: {
        type: String,
        default: 'UNASSIGNED_CLIENT'
    },
    similarity: {
        type: Number,
        default: null
    },
    ispass: {
        type: Boolean,
        default: false
    },
    deviceID: {
        type: String,
        trim: true
    },
    info: {
        CheckIn: {
            type: Date
        },
        CheckInImage: {
            type: String
        },
        CheckOut: {
            type: Date
        },
        CheckOutImage: {
            type: String
        }
    },
    CreateTime: {
        type: Date,
        default: () => new Date()
    }
}, {
    versionKey: false,
    collection: 'InfoCheckInOut'
});

module.exports = {
    InfoCheckInOutModel: model('InfoCheckInOut', InfoCheckInOutSchema)
};