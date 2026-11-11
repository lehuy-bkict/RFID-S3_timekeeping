'use strict'

const express = require('express')
const router = express.Router()
const homeController = require('../controllers/dashboard.controller') 
const InfoCheckInOutModel = require('../controllers/checkinout.controller')
const userController = require('../controllers/user.controller')
const faceVerificationController = require('../controllers/faceVerification.controller')
const bypassScanController = require('../controllers/bypassScan.controller')
const cameraConfigController = require('../controllers/cameraConfig.controller')
const pingController = require('../../routers/ping.js')
const { CatChErr } = require('../../utils/errcatch')

router.get('/ping', pingController.ping)
router.get('/Home/DashBoardInfo', CatChErr.handleErr(homeController.DashBoardInfo)) 
router.post('/Home/DashBoardInput', CatChErr.handleErr(homeController.DashBoardInput))

router.post('/CheckInOut/GetData', CatChErr.handleErr(InfoCheckInOutModel.GetData))
router.post('/CheckInOut/DeleteData', CatChErr.handleErr(InfoCheckInOutModel.DeleteData))
router.post('/CheckInOut/BypassScan', CatChErr.handleErr(bypassScanController.create))
router.get('/CameraConfig', CatChErr.handleErr(cameraConfigController.get))
router.post('/CameraConfig', CatChErr.handleErr(cameraConfigController.save))
router.post('/FaceVerification/Verify', CatChErr.handleErr(faceVerificationController.verify))

router.post('/User/GetData', CatChErr.handleErr(userController.GetData))
router.post('/User/Create', CatChErr.handleErr(userController.Create))
router.post('/User/Update', CatChErr.handleErr(userController.Update))
router.post('/User/Delete', CatChErr.handleErr(userController.Delete))

module.exports = router
