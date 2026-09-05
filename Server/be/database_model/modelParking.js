'use strict'
const {Types, Schema, model} = require('mongoose')
const { date } = require('yup')

const InfoCheckInOutSchema = new Schema({
    _id: {
        type: Types.ObjectId,
        default: new Types.ObjectId()
    }, 
    cardNumber: {
        type: String
    } , 
    ispass: {
        type: Boolean,
        default: false
    } ,  
    deviceID: {
        type: String,
        //required: true
    },
    info: { 
        CheckIn: {
            type: Date,
            //required: true
        },
        CheckInImage: {
            type: String
        },
        CheckOut: {
            type: Date,
            //required: true
        },
        CheckOutImage: {
            type: String
        }
    },
    CreateTime: {
        type: Date,
        default: new Date()
    } 
}, {
    versionKey: false,
    collection: 'InfoCheckInOut',
})

module.exports = {
    InfoCheckInOutModel :  model('InfoCheckInOut', InfoCheckInOutSchema )
}