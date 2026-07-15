'use strict'

const { DashboardService } = require('../services/dashboard.service.js');
const { Types } = require('mongoose');
const { decryptString } = require('../../utils/checkapikey.js');

class homeController {
    async DashBoardInfo(req, res) {
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
            const lstUser = await DashboardService.GetInfoCheckInOut({});
            return res.send({
                success: true,
                messages: "",
                error: "",
                data: lstUser
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
    async DashBoardInput(req, res) {
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
            const { fromdate, todate } = req.body;

            let query = { "info.CheckOut": null };
            if (fromdate && todate) {
                query["info.CheckIn"] = { $gte: new Date(fromdate), $lte: new Date(todate) };
            } else if (fromdate) {
                query["info.CheckIn"] = { $gte: new Date(fromdate) };
            } else if (todate) {
                query["info.CheckIn"] = { $lte: new Date(todate) };
            }

            const lstUser = await DashboardService.GetInfoCheckInOut(query);

            return res.send({
                success: true,
                messages: "",
                error: "",
                data: lstUser
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
    async DashBoardOutput(req, res) {
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
            const { fromdate, todate } = req.body;

            let query = { "info.CheckOut": { $ne: null } }; 
            if (fromdate && todate) {
                query["info.CheckIn"] = { $gte: new Date(fromdate), $lte: new Date(todate) };
            } else if (fromdate) {
                query["info.CheckIn"] = { $gte: new Date(fromdate) };
            } else if (todate) {
                query["info.CheckIn"] = { $lte: new Date(todate) };
            }

            const lstUser = await DashboardService.GetInfoCheckInOut(query);

            return res.send({
                success: true,
                messages: "",
                error: "",
                data: lstUser
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

module.exports = new homeController();