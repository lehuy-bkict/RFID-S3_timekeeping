'use strict';

const express = require('express');
const app = express();
const path = require('path');
const http = require('http');
const server = http.createServer(app);

const { initSocket } = require('./base_connects/base_socketIO/init.socket');
initSocket(server);  

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
require('dotenv').config();

app.use(cookieParser());

const cors = require("cors");
const compression = require('compression');
const corsOptions = {
  origin: '*',
  credentials: true,
  SuccessStatus: 200,
};
app.use(compression());
app.use(cors(corsOptions));

app.use(bodyParser.urlencoded({
  parameterLimit: 100000,
  limit: '100mb',
  extended: true,
}));
app.use(bodyParser.json({ limit: '100mb' }));

require('./base_connects/base_mongodb/init.mongodb');

app.use('/', require('./routers/index'));

app.use(express.static(path.join(__dirname, 'build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

require('./base_connects/base_mqtt/init.mqtt');
require('./v1/device');

// Middleware bắt lỗi
app.use((req, res, next) => {
  const error = new Error('Not Found');
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  const statusCode = error.status || 500;
  return res.status(statusCode).json({
    status: 'error',
    code: statusCode,
    message: error.message || 'Internal Server Error',
  });
});

module.exports = {
  app,
  server,
};
