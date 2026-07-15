const { Types } = require('mongoose');
const { CheckInEventService } = require('../services/checkinout.service');
const { decryptString } = require('../../utils/checkapikey.js');

class InfoCheckInOutModel {
   async GetData(req, res) {
  // Get API key
        let apiKey = req.headers['x-api-key'];
        if (!apiKey) {
            return res.send({
                success: false,
                messages: "API key không tồn tại",
                error: "",
                data: {}
            });
        }

        // Verify API key
        var _isValid = true;
        await decryptString(apiKey).then((success) => {
            _isValid = true;
        }).catch((err) => {
            _isValid = false;
        });

        if (!_isValid) {
            return res.send({
                success: false,
                messages: "API key không hợp lệ",
                error: "",
                data: apiKey
            });
        }

    try {
        const { fromDate, toDate, ispass } = req.body;

        if (fromDate && isNaN(Date.parse(fromDate))) {
            return res.send({
                success: false,
                messages: "Ngày bắt đầu không hợp lệ",
                error: "InvalidDate",
                data: {}
            });
        }
        if (toDate && isNaN(Date.parse(toDate))) {
            return res.send({
                success: false,
                messages: "Ngày kết thúc không hợp lệ",
                error: "InvalidDate",
                data: {}
            });
        }

        const query = {};

        if (typeof ispass !== 'undefined') {
            query.ispass = ispass;
        }

        const startDate = fromDate ? new Date(fromDate) : new Date(0);
        const endDate = toDate ? new Date(toDate) : new Date(); 

        query["info.CheckIn"] = { $gte: startDate, $lte: endDate };

        if (toDate) {
            query["$or"] = [
                { "info.CheckOut": { $lte: endDate } },
                { "info.CheckOut": null }
            ];
        }

        const lstParking = await CheckInEventService.getby(query);
        const returnParking = lstParking.map(parking => ({
            _id: parking._id,
            cardNumber: parking.cardNumber,
            ispass: parking.ispass,
            deviceID: parking.deviceID,
            info: {
                CheckIn: parking.info.CheckIn,
                CheckOut: parking.info.CheckOut
            },
            CreateTime: parking.CreateTime
        }));

        return res.send({
            success: true,
            messages: "",
            error: "",
            data: returnParking
        });
    } catch (Exception) {
            console.log(Exception);
            return res.send({
                success: false,
                messages: Exception.toString(),
                error: "1",
                data: {}
            });
        }
}

    async DeleteData(req, res) {
        // Get API key
                let apiKey = req.headers['x-api-key'];
                if (!apiKey) {
                    return res.send({
                        success: false,
                        messages: "API key không tồn tại",
                        error: "",
                        data: {}
                    });
                }
        
                // Verify API key
                var _isValid = true;
                await decryptString(apiKey).then((success) => {
                    _isValid = true;
                }).catch((err) => {
                    _isValid = false;
                });
        
                if (!_isValid) {
                    return res.send({
                        success: false,
                        messages: "API key không hợp lệ",
                        error: "",
                        data: apiKey
                    });
                }
        try {
            const { _id } = req.body;

            if (!_id || !Types.ObjectId.isValid(_id)) {
                return res.send({
                    success: false,
                    messages: "ID không hợp lệ",
                    error: "",
                    data: {}
                });
            }

            const result = await CheckInEventService.Delete({ _id });

            if (!result) {
                return res.send({
                    success: false,
                    messages: "Không tìm thấy dữ liệu để xóa",
                    error: "",
                    data: {}
                });
            }

            return res.send({
                success: true,
                messages: "Xóa dữ liệu thành công",
                error: "",
                data: result
            });
        } catch (Exception) {
            console.log(Exception);
            return res.send({
                success: false,
                messages: Exception.toString(),
                error: "1",
                data: {}
            });
        }
    }
}

module.exports = new InfoCheckInOutModel();