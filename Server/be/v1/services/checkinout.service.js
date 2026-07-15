'use strict'
const { InfoCheckInOutModel } = require('../../database_model/modelParking');


class CheckInEventService {
     
    async Insert(model) {
        return await InfoCheckInOutModel.create(model);
    }
    /** Lấy toàn bộ danh sách theo bo loc */
    async getby(query) {
        if (!InfoCheckInOutModel) {
            return []; 
        }
        return await InfoCheckInOutModel.find(query).lean()
    }
    /** Push area cho client developer, upsert: false */
    async Update(query, push) {
        return await InfoCheckInOutModel.findOneAndUpdate(query, push, {upsert: false, new: true}).lean()
    }
    async Delete(query) {
        return await InfoCheckInOutModel.findOneAndRemove(query).lean()
    }
}

module.exports = {
    CheckInEventService: new CheckInEventService()
}