'use strict';

const { CheckInEventService } = require('../services/checkinout.service');
const { capturePhotoBase64 } = require('../../utils/camera');
const { decryptString } = require('../../utils/checkapikey');
const { getIO } = require('../../base_connects/base_socketIO/init.socket');
const { getLatestCameraFrame } = require('../../base_connects/base_mqtt/cameraFrames');

async function create(req, res) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ success: false, messages: 'API key không tồn tại' });
  }

  try {
    await decryptString(apiKey);
  } catch (error) {
    return res.status(401).json({ success: false, messages: 'API key không hợp lệ' });
  }

  const cameraSource = req.body?.cameraSource || 'desktop';
  if (cameraSource !== 'desktop' && cameraSource !== 'esp32') {
    return res.status(400).json({
      success: false,
      messages: 'Nguồn camera không hợp lệ.'
    });
  }

  let image;
  if (cameraSource === 'esp32') {
    const frame = getLatestCameraFrame();
    if (!frame) {
      return res.status(503).json({
        success: false,
        messages: 'Camera ESP32 chưa kết nối hoặc chưa có frame mới; chưa ghi nhận bypass.'
      });
    }
    image = `data:image/jpeg;base64,${frame.toString('base64')}`;
  } else {
    image = await capturePhotoBase64();
  }

  if (!image) {
    return res.status(503).json({
      success: false,
      messages: `Không chụp được ảnh từ camera ${cameraSource === 'esp32' ? 'ESP32' : 'desktop'}; chưa ghi nhận bypass.`
    });
  }

  const data = {
    rfid: 'bypass',
    timestamp: new Date().toISOString(),
    device: 'WEB_BYPASS',
    cameraSource
  };
  const savedDoc = await CheckInEventService.saveScan(data, image, 'bypass', 'BYPASS');
  if (!savedDoc) {
    throw new Error('Không lưu được sự kiện bypass vào cơ sở dữ liệu.');
  }

  const isCheckOut = !!savedDoc.ispass;
  const event = {
    ...data,
    eventId: String(savedDoc._id),
    userName: 'bypass',
    verificationStatus: 'BYPASS',
    cameraSource,
    isCheckOut,
    image,
    verified: false,
    isMatch: null
  };

  try {
    getIO().emit('rfid-scan-completed', event);
  } catch (error) {
    console.error('[Bypass] Database saved, but realtime notification failed:', error.message);
  }

  return res.json({
    success: true,
    messages: 'Đã chụp ảnh và lưu lượt bypass.',
    data: event
  });
}

module.exports = { create };
