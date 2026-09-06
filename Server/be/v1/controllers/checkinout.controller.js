const { Types } = require('mongoose');
const { CheckInEventService } = require('../services/checkinout.service');
const { decryptString } = require('../../utils/checkapikey.js');

function parseDateStart(dStr) {
    if (!dStr) return null;
    const parts = String(dStr).trim().split('-');
    if (parts.length === 3) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 0, 0, 0, 0);
    }
    const d = new Date(dStr);
    d.setHours(0, 0, 0, 0);
    return d;
}

function parseDateEnd(dStr) {
    if (!dStr) return null;
    const parts = String(dStr).trim().split('-');
    if (parts.length === 3) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 23, 59, 59, 999);
    }
    const d = new Date(dStr);
    d.setHours(23, 59, 59, 999);
    return d;
}

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

        const hasFrom = fromDate && typeof fromDate === 'string' && fromDate.trim() && !isNaN(Date.parse(fromDate));
        const hasTo = toDate && typeof toDate === 'string' && toDate.trim() && !isNaN(Date.parse(toDate));

        if (hasFrom || hasTo) {
            query["info.CheckIn"] = {};
            if (hasFrom) {
                query["info.CheckIn"].$gte = parseDateStart(fromDate);
            }
            if (hasTo) {
                query["info.CheckIn"].$lte = parseDateEnd(toDate);
            }
        }

        const records = await CheckInEventService.getby(query);
        const attendanceRecords = records.map(item => ({
            _id: item._id,
            cardNumber: item.cardNumber,
            userName: item.userName || 'client',
            verificationStatus: item.verificationStatus || 'UNASSIGNED_CLIENT',
            similarity: item.similarity ?? null,
            ispass: item.ispass,
            deviceID: item.deviceID,
            info: {
                CheckIn: item.info?.CheckIn,
                CheckInImage: item.info?.CheckInImage || null,
                CheckOut: item.info?.CheckOut,
                CheckOutImage: item.info?.CheckOutImage || null
            },
            CreateTime: item.CreateTime
        }));

        return res.send({
            success: true,
            messages: "",
            error: "",
            data: attendanceRecords
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