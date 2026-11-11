'use strict';

const crypto = require('crypto');
const { RfidScanEventModel } = require('../../database_model/modelRfidScanEvent');

function getScanTime(timestamp) {
  return timestamp && timestamp !== 'null' && !Number.isNaN(Date.parse(timestamp))
    ? new Date(timestamp)
    : new Date();
}

function createFallbackScanId(rawPayload) {
  return crypto.createHash('sha256').update(rawPayload).digest('hex');
}

class RfidScanEventService {
  async recordReceived(data, rawPayload) {
    const scanId = typeof data.id === 'string' && data.id.trim()
      ? data.id.trim()
      : createFallbackScanId(rawPayload);

    return RfidScanEventModel.findOneAndUpdate(
      { scanId },
      {
        $setOnInsert: {
          scanId,
          cardNumber: data.rfid ? String(data.rfid).trim() : 'unknown',
          deviceID: data.device ? String(data.device) : undefined,
          scannedAt: getScanTime(data.timestamp),
          rawPayload,
          status: 'RECEIVED'
        },
        $set: { updatedAt: new Date() }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
  }

  async update(scanId, updates) {
    return RfidScanEventModel.findOneAndUpdate(
      { scanId },
      { $set: { ...updates, updatedAt: new Date() } },
      { new: true, runValidators: true }
    ).lean();
  }

  async findPending() {
    return RfidScanEventModel.find({
      status: {
        $in: ['RECEIVED', 'IMAGE_CAPTURED', 'CAMERA_RETRYING', 'PROCESSING_ERROR', 'USER_LOOKUP_FAILED']
      }
    }).sort({ createdAt: 1 }).limit(100).lean();
  }
}

module.exports = {
  RfidScanEventService: new RfidScanEventService()
};
