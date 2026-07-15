'use strict'

const express = require('express')
const router = express.Router()
const homeController = require('../controllers/dashboard.controller') 
const InfoCheckInOutModel = require('../controllers/checkinout.controller')
const { CatChErr } = require('../../utils/errcatch')

router.get('/Home/DashBoardInfo', CatChErr.handleErr(homeController.DashBoardInfo)) 
router.post('/Home/DashBoardInput', CatChErr.handleErr(homeController.DashBoardInput))

router.post('/CheckInOut/GetData', CatChErr.handleErr(InfoCheckInOutModel.GetData))
router.post('/CheckInOut/DeleteData', CatChErr.handleErr(InfoCheckInOutModel.DeleteData))

module.exports = router