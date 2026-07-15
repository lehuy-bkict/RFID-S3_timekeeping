'use strict';

const mqtt = require('mqtt');
require('dotenv').config();
const { getIO } = require('../base_socketIO/init.socket'); 

const client = mqtt.connect(process.env.MQTT_HOST);

client.on('connect', () => {
  console.log('Connected to MQTT broker');
  client.subscribe('esp32/rfid/data', (err) => {
    if (err) {
      console.error('Failed to subscribe to topic:', err.message);
    } else {
      console.log('Subscribed to topic: esp32/rfid/data');
    }
  });
});

client.on('message', (topic, message) => {
  console.log(`[MQTT] ${topic}: ${message.toString()}`);

  try {
    const data = JSON.parse(message.toString());

    const io = getIO();
    io.emit('rfid-scan', data);  

  } catch (err) {
    console.error('JSON parse error:', err.message);
  }
});

client.on('error', (err) => {
  console.error('MQTT connection error:', err.message);
});

client.on('reconnect', () => {
  console.log('🔄 Reconnecting to MQTT broker...');
});

module.exports = { client };
