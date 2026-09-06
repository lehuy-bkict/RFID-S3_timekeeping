'use strict';

const { client } = require('../base_connects/base_mqtt/init.mqtt');
const { getIO } = require('../base_connects/base_socketIO/init.socket');
const { CheckInEventService } = require('./services/checkinout.service');
const { UserService } = require('./services/user.service');
const faceVerification = require('./services/faceVerification.service');
const { capturePhotoBase64 } = require('../utils/camera');
const { Types } = require('mongoose');

async function saveScan(data, image, userName = 'client', verificationStatus = 'UNASSIGNED_CLIENT', similarity = null) {
  const { rfid, timestamp, device } = data;
  const scanTime = (timestamp && timestamp !== 'null' && !isNaN(Date.parse(timestamp))) ? new Date(timestamp) : new Date();
  const query = { cardNumber: rfid, ispass: false };
  const existing = await CheckInEventService.getby(query);

  if (existing && existing.length > 0) {
    return CheckInEventService.Update(
      { _id: new Types.ObjectId(existing[0]._id) },
      {
        $set: {
          'info.CheckOut': scanTime,
          'info.CheckOutImage': image || null,
          ispass: true,
          userName: userName,
          verificationStatus: verificationStatus,
          similarity: similarity
        }
      }
    );
  }

  return CheckInEventService.Insert({
    _id: new Types.ObjectId(),
    cardNumber: rfid,
    userName: userName,
    verificationStatus: verificationStatus,
    similarity: similarity,
    ispass: false,
    deviceID: device,
    info: {
      CheckIn: scanTime,
      CheckInImage: image || null,
      CheckOut: null,
      CheckOutImage: null
    },
    CreateTime: new Date()
  });
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

    // Check if RFID card is assigned to a registered user
    const user = await UserService.getByCardNumber(rfid);

    if (user) {
      // Case 1: Card assigned to registered user
      console.log(`[RFID] Card ${rfid} is assigned to User: "${user.name}". Proceeding with face verification...`);

      if (!user.avatar) {
        console.warn(`[Face AI] User ${user.name} does not have an original portrait photo registered.`);
      }

      if (!imageBase64) {
        console.warn(`[Face AI] No camera image available to verify against user photo.`);
        try {
          const io = getIO();
          io.emit('rfid-scan-rejected', {
            ...data,
            userName: user.name,
            reason: 'Unable to capture camera snapshot for face verification.',
            image: null,
            verified: false
          });
        } catch (err) {
          console.error('Socket IO error:', err.message);
        }
        return;
      }

      // Verify live camera snapshot against registered portrait
      const verifyResult = await faceVerification.verify(user.avatar, imageBase64, 0.4);
      console.log(`[Face AI] Verification result for ${user.name}:`, {
        success: verifyResult.success,
        isMatch: verifyResult.isMatch,
        similarity: verifyResult.similarity,
        message: verifyResult.message
      });

      if (verifyResult.success && verifyResult.isMatch) {
        // Match: Save attendance event to database
        const savedDoc = await saveScan(data, imageBase64, user.name, 'MATCHED', verifyResult.similarity);
        const isCheckOut = !!(savedDoc && savedDoc.ispass);

        console.log(`[Database] Access GRANTED for User "${user.name}" (Card ${rfid}). Saved to database.`);

        try {
          const io = getIO();
          io.emit('rfid-scan-completed', {
            ...data,
            userName: user.name,
            isCheckOut,
            image: imageBase64,
            verified: true,
            isMatch: true,
            similarity: verifyResult.similarity
          });
        } catch (ioErr) {
          console.error('Socket IO broadcast error:', ioErr.message);
        }
      } else {
        // Mismatch: Reject access and do not log attendance
        console.warn(`[Face AI] REJECTED: Card ${rfid} belongs to User "${user.name}" but face does NOT match! NOT saved to database.`);

        try {
          const io = getIO();
          io.emit('rfid-scan-rejected', {
            ...data,
            userName: user.name,
            reason: verifyResult.message || 'Face does not match the registered profile for this card.',
            image: imageBase64,
            verified: false,
            isMatch: false,
            similarity: verifyResult.similarity ?? 0
          });
        } catch (ioErr) {
          console.error('Socket IO broadcast error:', ioErr.message);
        }
      }
    } else {
      // Case 2: Card is unassigned (record as client)
      console.log(`[RFID] Card ${rfid} is unassigned. Recording as client...`);
      const savedDoc = await saveScan(data, imageBase64, 'client', 'UNASSIGNED_CLIENT', null);
      const isCheckOut = !!(savedDoc && savedDoc.ispass);

      console.log(`[Database] Access logged for Client (Card ${rfid}). Saved to database.`);

      try {
        const io = getIO();
        io.emit('rfid-scan-completed', {
          ...data,
          userName: 'client',
          isCheckOut,
          image: imageBase64,
          verified: false,
          isMatch: null
        });
      } catch (ioErr) {
        console.error('Socket IO broadcast error:', ioErr.message);
      }
    }
  } catch (error) {
    console.error('[MQTT] Error processing message:', error.message);
  }
});
