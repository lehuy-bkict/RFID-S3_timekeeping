'use strict'

const { InfoCheckInOutModel } = require('../../database_model/modelParking')  

class DashboardService {
    
    async GetInfoCheckInOut(query) {
        return await InfoCheckInOutModel.find(query).lean()
    } 
    async InfoCheckInOutInsert(model) {
        return await InfoCheckInOutModel.create(model)
    }
    /** Push area cho client developer, upsert: false */
    async InfoCheckInOutUpdate(query, push) {
        return await InfoCheckInOutModel.findOneAndUpdate(query, push, {upsert: false, new: true}).lean()
    }
    async InfoCheckInOutDelete(query) {
        return await InfoCheckInOutModel.findOneAndRemove(query).lean()
    } 
}
module.exports = {
    DashboardService: new DashboardService()
}