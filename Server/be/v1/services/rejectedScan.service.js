'use strict';

const { RejectedScanModel } = require('../../database_model/modelRejectedScan');

class RejectedScanService {
  async save(data) {
    const scannedAt = data.timestamp && data.timestamp !== 'null' &&
      !Number.isNaN(Date.parse(data.timestamp))
      ? new Date(data.timestamp)
      : new Date();

    return RejectedScanModel.create({
      scanId: data.id,
      cardNumber: data.rfid,
      userName: data.userName || 'Unknown',
      deviceID: data.device,
      cameraSource: data.cameraSource || 'desktop',
      scannedAt,
      cameraFrameReceivedAt: data.cameraFrameReceivedAt || null,
      cameraFrameAgeMs: data.cameraFrameAgeMs ?? null,
      image: data.image || null,
      failureCode: data.failureCode,
      reason: data.reason,
      similarity: data.similarity ?? null,
      threshold: data.threshold ?? null
    });
  }
}

module.exports = {
  RejectedScanService: new RejectedScanService()
};
