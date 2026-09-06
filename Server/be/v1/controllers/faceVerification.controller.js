'use strict';

const faceVerification = require('../services/faceVerification.service');

function isBase64Image(value) {
  return typeof value === 'string' && value.length > 32 && /^data:image\/[a-zA-Z+.-]+;base64,/.test(value);
}

async function verify(req, res) {
  const { cardImage, cameraImage, threshold } = req.body || {};
  if (!isBase64Image(cardImage) || !isBase64Image(cameraImage)) {
    return res.status(400).json({
      success: false,
      isMatch: false,
      message: 'Cần cung cấp đủ 2 ảnh ở định dạng data:image/...;base64,...'
    });
  }
  if (threshold !== undefined && (!Number.isFinite(Number(threshold)) || Number(threshold) < 0 || Number(threshold) > 1)) {
    return res.status(400).json({ success: false, isMatch: false, message: 'threshold phải nằm trong khoảng 0 đến 1' });
  }
  const result = await faceVerification.verify(cardImage, cameraImage, threshold);
  return res.status(result.success ? 200 : 422).json(result);
}

module.exports = { verify };
