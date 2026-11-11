'use strict';

const { getIO } = require('../base_socketIO/init.socket');

const CAMERA_FRAME_TOPIC = process.env.MQTT_CAMERA_FRAME_TOPIC || 'esp32/camera/frame';
const CAMERA_STATUS_TOPIC = process.env.MQTT_CAMERA_STATUS_TOPIC || 'esp32/camera/status';
const configuredFrameAge = Number(process.env.CAMERA_FRAME_MAX_AGE_MS || 500);
const MAX_CAMERA_FRAME_AGE_MS = Number.isFinite(configuredFrameAge) && configuredFrameAge > 0
  ? configuredFrameAge
  : 500;
let latestCameraFrame = null;
let lastFrameTime = 0;
let cameraOnline = false;
let lastEmittedConnected = null;
let lastFrameLogAt = 0;

function emitCameraStatusIfChanged() {
  const status = getCameraStatus();
  if (status.connected !== lastEmittedConnected) {
    lastEmittedConnected = status.connected;
    getIO().emit('esp32-camera-status', status);
  }
}

function handleCameraMessage(topic, message) {
  if (topic === CAMERA_FRAME_TOPIC) {
    if (message.length < 4 || message[0] !== 0xff || message[1] !== 0xd8) {
      console.warn('[Camera MQTT] Ignored an invalid JPEG frame.');
      return;
    }

    latestCameraFrame = Buffer.from(message);
    lastFrameTime = Date.now();
    cameraOnline = true;
    if (lastFrameTime - lastFrameLogAt >= 5000) {
      console.log(`[Camera MQTT] Received JPEG frame (${message.length} bytes).`);
      lastFrameLogAt = lastFrameTime;
    }
    getIO().emit('esp32-camera-frame', latestCameraFrame);
    emitCameraStatusIfChanged();
    return;
  }

  if (topic === CAMERA_STATUS_TOPIC) {
    const status = message.toString();
    if (status !== 'online' && status !== 'offline') {
      console.warn(`[Camera MQTT] Ignored invalid camera status: ${status}`);
      return;
    }
    cameraOnline = status === 'online';
    if (!cameraOnline) {
      latestCameraFrame = null;
      lastFrameTime = 0;
    }
    emitCameraStatusIfChanged();
  }
}

function getCameraStatus() {
  return {
    connected: cameraOnline &&
      lastFrameTime > 0 &&
      Date.now() - lastFrameTime <= MAX_CAMERA_FRAME_AGE_MS,
    lastFrameTime
  };
}

function getLatestCameraFrame(maxAgeMs = MAX_CAMERA_FRAME_AGE_MS) {
  const frame = getLatestCameraFrameDetails(maxAgeMs);
  return frame ? frame.image : null;
}

function getLatestCameraFrameDetails(maxAgeMs = MAX_CAMERA_FRAME_AGE_MS) {
  const ageMs = Date.now() - lastFrameTime;
  if (!latestCameraFrame || !cameraOnline || ageMs > maxAgeMs) {
    return null;
  }
  return {
    image: Buffer.from(latestCameraFrame),
    receivedAt: new Date(lastFrameTime),
    ageMs
  };
}

async function waitForLatestCameraFrame(maxAgeMs = MAX_CAMERA_FRAME_AGE_MS, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    const frame = getLatestCameraFrameDetails(maxAgeMs);
    if (frame) {
      return frame;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  return null;
}

const cameraStatusInterval = setInterval(emitCameraStatusIfChanged, 500);
cameraStatusInterval.unref();

module.exports = {
  CAMERA_FRAME_TOPIC,
  CAMERA_STATUS_TOPIC,
  handleCameraMessage,
  getCameraStatus,
  getLatestCameraFrame,
  getLatestCameraFrameDetails,
  waitForLatestCameraFrame
};
