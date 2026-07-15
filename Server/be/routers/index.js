'use strict'

const express = require('express')
const pingController = require('./ping.js')
  
const router = express.Router();

router.get('/ping', pingController.ping);

router.use('/api/V1/Developer', require('../v1/routers/developer.router'))
module.exports = router