'use strict';

const { Schema, model } = require('mongoose');

const RejectedScanSchema = new Schema({
  scanId: {
    type: String,
    trim: true
  },
  cardNumber: {
    type: String,
    trim: true,
    required: true
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
  cameraSource: {
    type: String,
    enum: ['desktop', 'esp32'],
    default: 'desktop'
  },
  scannedAt: {
    type: Date,
    required: true
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
  failureCode: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  similarity: {
    type: Number,
    default: null
  },
  threshold: {
    type: Number,
    default: null
  },
  createdAt: {
    type: Date,
    default: () => new Date()
  }
}, {
  versionKey: false,
  collection: 'RejectedScans'
});

module.exports = {
  RejectedScanModel: model('RejectedScans', RejectedScanSchema)
};
