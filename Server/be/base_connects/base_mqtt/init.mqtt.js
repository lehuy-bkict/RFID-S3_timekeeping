'use strict';

const mqtt = require('mqtt');
require('dotenv').config();
const {
  CAMERA_FRAME_TOPIC,
  CAMERA_STATUS_TOPIC,
  handleCameraMessage
} = require('./cameraFrames');

const client = mqtt.connect(process.env.MQTT_HOST || 'mqtt://10.51.249.95:1883');
const topic = process.env.MQTT_TOPIC || 'esp32/rfid/data';

client.on('connect', () => {
  console.log('Connected to MQTT broker');
  client.subscribe([topic, CAMERA_FRAME_TOPIC, CAMERA_STATUS_TOPIC], (err) => {
    if (err) {
      console.error('Failed to subscribe to topic:', err.message);
    } else {
      console.log(`Subscribed to MQTT topics: ${topic}, ${CAMERA_FRAME_TOPIC}, ${CAMERA_STATUS_TOPIC}`);
    }
  });
});

client.on('message', (messageTopic, message) => {
  if (messageTopic === CAMERA_FRAME_TOPIC || messageTopic === CAMERA_STATUS_TOPIC) {
    handleCameraMessage(messageTopic, message);
    return;
  }
  if (messageTopic === topic) {
    console.log(`[MQTT] ${messageTopic}: ${message.toString()}`);
  }
});

client.on('error', (err) => {
  console.error('MQTT connection error:', err.message);
});

client.on('reconnect', () => {
  console.log('🔄 Reconnecting to MQTT broker...');
});

module.exports = {
  client,
  topic,
  CAMERA_FRAME_TOPIC,
  CAMERA_STATUS_TOPIC
};
