'use strict';

const { Schema, model } = require('mongoose');

const RfidScanEventSchema = new Schema({
  scanId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  cardNumber: {
    type: String,
    default: 'unknown',
    trim: true
  },
  userName: {
    type: String,
    default: 'Unknown',
    trim: true
  },
  deviceID: {
    type: String,
    trim: true
  },
  scannedAt: {
    type: Date,
    required: true
  },
  cameraSource: {
    type: String,
    enum: ['desktop', 'esp32'],
    default: 'desktop'
  },
  cameraFrameReceivedAt: {
    type: Date,
    default: null
  },
  cameraFrameAgeMs: {
    type: Number,
    default: null
  },
  image: {
    type: String,
    default: null
  },
  status: {
    type: String,
    required: true,
    default: 'RECEIVED'
  },
  failureCode: {
    type: String,
    default: null
  },
  reason: {
    type: String,
    default: null
  },
  similarity: {
    type: Number,
    default: null
  },
  threshold: {
    type: Number,
    default: null
  },
  rawPayload: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: () => new Date()
  },
  updatedAt: {
    type: Date,
    default: () => new Date()
  }
}, {
  versionKey: false,
  collection: 'RfidScanEvents'
});

module.exports = {
  RfidScanEventModel: model('RfidScanEvents', RfidScanEventSchema)
};
