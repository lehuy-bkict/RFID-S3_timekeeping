'use strict';

const { client } = require('../base_connects/base_mqtt/init.mqtt');
const { getIO } = require('../base_connects/base_socketIO/init.socket');
const { CheckInEventService } = require('./services/checkinout.service');
const { capturePhotoBase64 } = require('../utils/camera');
const { Types } = require('mongoose');

async function saveScan(data, image) {
  const { rfid, timestamp, device } = data;
  const query = { cardNumber: rfid, ispass: false };
  const existing = await CheckInEventService.getby(query);

  if (existing && existing.length > 0) {
    return CheckInEventService.Update(
      { _id: new Types.ObjectId(existing[0]._id) },
      {
        $set: {
          'info.CheckOut': new Date(timestamp),
          'info.CheckOutImage': image || null,
          ispass: true
        }
      }
    );
  }

  return CheckInEventService.Insert({
    _id: new Types.ObjectId(),
    cardNumber: rfid,
    ispass: false,
    deviceID: device,
    info: {
      CheckIn: new Date(timestamp),
      CheckInImage: image || null,
      CheckOut: null,
      CheckOutImage: null
    },
    CreateTime: new Date()
  });
}

async function processScan(data, image) {
  try {
    const result = await saveScan(data, image);
    console.log(`[Database] Successfully saved RFID scan for card ${data.rfid} with image: ${image ? 'YES' : 'NO'}`);
    return result;
  } catch (error) {
    console.error('Error saving RFID scan to database:', error.message);
    return null;
  }
}

client.on('message', async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    const { rfid, timestamp, device } = data;

    // Validate incoming data
    if (!rfid || !timestamp || !device) {
      console.error('[MQTT] Invalid data received:', data);
      return;
    }

    console.log(`[MQTT] Received scan event for RFID: ${rfid} from device: ${device}. Capturing camera photo...`);

    // Directly capture photo from server's camera
    const imageBase64 = await capturePhotoBase64();

    if (imageBase64) {
      console.log(`[Camera] Photo captured successfully (Base64 length: ${imageBase64.length})`);
    } else {
      console.warn('[Camera] Failed to capture photo or camera unavailable.');
    }

    // Save scan data along with captured Base64 image to database
    const savedDoc = await processScan(data, imageBase64);
    const isCheckOut = !!(savedDoc && savedDoc.ispass);

    // Emit event with captured image and check-out status to connected socket clients
    try {
      const io = getIO();
      io.emit('rfid-scan-completed', {
        ...data,
        isCheckOut,
        image: imageBase64
      });
    } catch (ioErr) {
      console.error('Socket IO broadcast error:', ioErr.message);
    }

  } catch (error) {
    console.error('[MQTT] Error processing message:', error.message);
  }
});
