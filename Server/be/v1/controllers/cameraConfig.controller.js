'use strict';

const { decryptString } = require('../../utils/checkapikey');
const {
  CameraConfigService,
  VALID_CAMERA_SOURCES
} = require('../services/cameraConfig.service');

async function authorize(req, res) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    res.status(401).json({ success: false, messages: 'API key không tồn tại' });
    return false;
  }

  try {
    await decryptString(apiKey);
    return true;
  } catch (error) {
    res.status(401).json({ success: false, messages: 'API key không hợp lệ' });
    return false;
  }
}

async function get(req, res) {
  if (!await authorize(req, res)) return;

  try {
    const cameraSource = await CameraConfigService.getCameraSource();
    return res.json({ success: true, data: { cameraSource } });
  } catch (error) {
    console.error('[Camera Config] Failed to load camera source:', error.message);
    return res.status(500).json({
      success: false,
      messages: 'Không thể tải cấu hình camera.'
    });
  }
}

async function save(req, res) {
  if (!await authorize(req, res)) return;

  const { cameraSource } = req.body || {};
  if (!VALID_CAMERA_SOURCES.has(cameraSource)) {
    return res.status(400).json({
      success: false,
      messages: 'Nguồn camera phải là desktop hoặc esp32.'
    });
  }

  try {
    await CameraConfigService.saveCameraSource(cameraSource);
    return res.json({
      success: true,
      messages: 'Đã lưu camera sử dụng cho lượt quẹt RFID.',
      data: { cameraSource }
    });
  } catch (error) {
    console.error('[Camera Config] Failed to save camera source:', error.message);
    return res.status(500).json({
      success: false,
      messages: 'Không thể lưu cấu hình camera.'
    });
  }
}

module.exports = { get, save };
