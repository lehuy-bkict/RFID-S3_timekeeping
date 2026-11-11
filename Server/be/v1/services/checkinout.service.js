'use strict'
const { InfoCheckInOutModel } = require('../../database_model/modelParking');
const { Types } = require('mongoose');


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

    async saveScan(data, image, userName = 'client', verificationStatus = 'UNASSIGNED_CLIENT', similarity = null) {
        const { rfid, timestamp, device } = data;
        const scanTime = (timestamp && timestamp !== 'null' && !isNaN(Date.parse(timestamp))) ? new Date(timestamp) : new Date();
        const existing = await this.getby({ cardNumber: rfid, ispass: false });

        if (existing.length > 0) {
            return this.Update(
                { _id: new Types.ObjectId(existing[0]._id) },
                {
                    $set: {
                        'info.CheckOut': scanTime,
                        'info.CheckOutImage': image || null,
                        'info.CheckOutCameraSource': data.cameraSource || 'desktop',
                        ispass: true,
                        userName,
                        verificationStatus,
                        similarity,
                        cameraSource: data.cameraSource || 'desktop'
                    }
                }
            );
        }

        return this.Insert({
            _id: new Types.ObjectId(),
            cardNumber: rfid,
            userName,
            verificationStatus,
            similarity,
            cameraSource: data.cameraSource || 'desktop',
            ispass: false,
            deviceID: device,
            info: {
                CheckIn: scanTime,
                CheckInImage: image || null,
                CheckInCameraSource: data.cameraSource || 'desktop',
                CheckOut: null,
                CheckOutImage: null
            },
            CreateTime: new Date()
        });
    }
}

module.exports = {
    CheckInEventService: new CheckInEventService()
}