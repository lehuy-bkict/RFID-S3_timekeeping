'use strict';

const express = require('express');
const app = express();
const fs = require('fs');
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

const buildDir = path.join(__dirname, 'build');
const indexHtml = path.join(buildDir, 'index.html');

app.use(express.static(buildDir));
app.get('*', (req, res, next) => {
  if (fs.existsSync(indexHtml)) {
    return res.sendFile(indexHtml);
  }
  return next();
});


// Middleware bắt lỗi
app.use((req, res, next) => {
  const error = new Error('Not Found');
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }
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
