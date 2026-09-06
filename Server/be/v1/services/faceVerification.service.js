'use strict';

const axios = require('axios');
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5000';

async function verify(cardImage, cameraImage, threshold) {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/verify`, {
      cardImage,
      cameraImage,
      threshold
    }, { timeout: Number(process.env.AI_SERVICE_TIMEOUT_MS || 20000) });
    return response.data;
  } catch (error) {
    const remoteMessage = error.response?.data?.message;
    return {
      success: false,
      isMatch: false,
      message: remoteMessage || `Không kết nối được Face AI local tại ${AI_SERVICE_URL}: ${error.message}`
    };
  }
}

module.exports = { verify };
