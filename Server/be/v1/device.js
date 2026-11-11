'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { client } = require('../base_connects/base_mqtt/init.mqtt');
const { getIO } = require('../base_connects/base_socketIO/init.socket');
const { CheckInEventService } = require('./services/checkinout.service');
const { UserService } = require('./services/user.service');
const faceVerification = require('./services/faceVerification.service');
const { waitForLatestCameraFrame } = require('../base_connects/base_mqtt/cameraFrames');
const { RejectedScanService } = require('./services/rejectedScan.service');
const { CameraConfigService } = require('./services/cameraConfig.service');
const { capturePhotoBase64 } = require('../utils/camera');
const { RfidScanEventService } = require('./services/rfidScanEvent.service');
const { topic: rfidTopic } = require('../base_connects/base_mqtt/init.mqtt');

const CAMERA_FRAME_MAX_AGE_MS = Number(process.env.CAMERA_FRAME_MAX_AGE_MS || 500);
const CAMERA_FRAME_WAIT_MS = Number(process.env.CAMERA_FRAME_WAIT_MS || 2000);
const DESKTOP_CAPTURE_TIMEOUT_MS = Number(process.env.DESKTOP_CAPTURE_TIMEOUT_MS || 6000);
const RFID_INBOX_DIR = path.resolve(__dirname, '..', '.rfid-inbox');
const processingScans = new Set();
const completedStatuses = new Set([
  'MATCHED',
  'FACE_MISMATCH',
  'FACE_VERIFICATION_FAILED',
  'UNASSIGNED_RECORDED',
  'ATTENDANCE_SAVE_FAILED',
  'INVALID_PAYLOAD'
]);

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function emitRealtimeScan(event) {
  try {
    getIO().emit('rfid-scan-realtime', event);
  } catch (error) {
    console.error('[Socket.IO] Failed to broadcast realtime RFID scan:', error.message);
  }
}

async function persistInboxMessage(rawPayload) {
  const fileName = `${crypto.createHash('sha256').update(rawPayload).digest('hex')}.json`;
  const filePath = path.join(RFID_INBOX_DIR, fileName);
  let attempt = 0;

  while (true) {
    let descriptor;
    let createdFile = false;
    try {
      fs.mkdirSync(RFID_INBOX_DIR, { recursive: true });
      descriptor = fs.openSync(filePath, 'wx');
      createdFile = true;
      fs.writeFileSync(descriptor, JSON.stringify({
        rawPayload,
        receivedAt: new Date().toISOString()
      }));
      fs.fsyncSync(descriptor);
      fs.closeSync(descriptor);
      return filePath;
    } catch (error) {
      if (descriptor !== undefined) {
        try {
          fs.closeSync(descriptor);
        } catch (closeError) {
          console.error('[MQTT] Failed to close local RFID inbox file:', closeError.message);
        }
      }
      if (createdFile) {
        try {
          fs.unlinkSync(filePath);
        } catch (removeError) {
          if (removeError.code !== 'ENOENT') {
            console.error('[MQTT] Failed to remove incomplete RFID inbox file:', removeError.message);
          }
        }
      }
      if (error.code === 'EEXIST') {
        return filePath;
      }
      attempt++;
      if (attempt === 1 || attempt % 10 === 0) {
        console.error(`[MQTT] Could not journal RFID message locally (attempt ${attempt}); retaining payload in memory and retrying: ${error.message}`);
      }
      await delay(Math.min(30000, 500 * (2 ** Math.min(attempt - 1, 6))));
    }
  }
}

function removeInboxMessage(filePath) {
  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`[MQTT] Persisted RFID event, but could not remove inbox file ${filePath}: ${error.message}`);
    }
  }
}

async function retryDatabaseWrite(operation, description) {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      attempt++;
      if (attempt === 1 || attempt % 10 === 0) {
        console.error(`[Database] ${description} failed (attempt ${attempt}); retaining scan and retrying: ${error.message}`);
      }
      const backoffMs = Math.min(30000, 500 * (2 ** Math.min(attempt - 1, 6)));
      await delay(backoffMs);
    }
  }
}

function captureDesktopWithTimeout() {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), DESKTOP_CAPTURE_TIMEOUT_MS);
    capturePhotoBase64()
      .then(image => {
        clearTimeout(timeout);
        resolve(image);
      })
      .catch(error => {
        clearTimeout(timeout);
        console.error('[Camera] Desktop capture failed:', error.message);
        resolve(null);
      });
  });
}

async function captureFromSource(cameraSource) {
  if (cameraSource === 'esp32') {
    const frame = await waitForLatestCameraFrame(
      CAMERA_FRAME_MAX_AGE_MS,
      CAMERA_FRAME_WAIT_MS
    );
    if (!frame) {
      return null;
    }

    return {
      image: `data:image/jpeg;base64,${frame.image.toString('base64')}`,
      receivedAt: frame.receivedAt,
      ageMs: frame.ageMs,
      cameraSource
    };
  }

  const image = await captureDesktopWithTimeout();
  return image
    ? { image, receivedAt: new Date(), ageMs: 0, cameraSource }
    : null;
}

async function captureScanPhoto(cameraSource) {
  try {
    const capture = await captureFromSource(cameraSource);
    if (!capture) {
      console.warn(`[Camera] No image from selected ${cameraSource} camera.`);
    }
    return capture;
  } catch (error) {
    console.error(`[Camera] Capture from selected ${cameraSource} camera failed: ${error.message}`);
    return null;
  }
}

function emitRejectedScan(event) {
  try {
    getIO().emit('rfid-scan-rejected', event);
  } catch (error) {
    console.error('[Socket.IO] Failed to broadcast rejected scan:', error.message);
  }
}

function emitCompletedScan(event) {
  try {
    getIO().emit('rfid-scan-completed', event);
  } catch (error) {
    console.error('[Socket.IO] Scan was saved, but completed event broadcast failed:', error.message);
  }
}

function emitCameraPending(event) {
  try {
    getIO().emit('rfid-scan-camera-pending', event);
  } catch (error) {
    console.error('[Socket.IO] Failed to broadcast pending camera capture:', error.message);
  }
}

async function processRfidScan(rawPayload, existingInboxPath = null) {
  let data = {};
  let parseError = null;
  try {
    const parsed = JSON.parse(rawPayload);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      data = parsed;
    } else {
      parseError = 'MQTT payload must be a JSON object.';
    }
  } catch (error) {
    parseError = `Invalid JSON MQTT payload: ${error.message}`;
  }

  if (!parseError && data.rfid && data.device) {
    const realtimeEventId = typeof data.id === 'string' && data.id.trim()
      ? data.id.trim()
      : crypto.createHash('sha256').update(rawPayload).digest('hex');
    emitRealtimeScan({
      ...data,
      id: realtimeEventId,
      eventId: realtimeEventId,
      userName: 'Unknown',
      verificationStatus: 'PENDING',
      eventPersisted: false
    });
  }

  const inboxPath = existingInboxPath || await persistInboxMessage(rawPayload);
  const scan = await retryDatabaseWrite(
    () => RfidScanEventService.recordReceived(data, rawPayload),
    'recording received RFID event'
  );
  removeInboxMessage(inboxPath);
  const scanId = scan.scanId;

  if (completedStatuses.has(scan.status)) {
    console.log(`[MQTT] Duplicate RFID delivery ${scanId}; event already recorded as ${scan.status}.`);
    return;
  }

  if (processingScans.has(scanId)) {
    console.log(`[MQTT] Duplicate RFID delivery ${scanId}; processing is already in progress.`);
    return;
  }
  processingScans.add(scanId);

  try {
    if (parseError || !data.rfid || !data.device) {
      const reason = parseError || 'RFID MQTT payload is missing rfid or device.';
      await retryDatabaseWrite(
        () => RfidScanEventService.update(scanId, {
          status: 'INVALID_PAYLOAD',
          failureCode: 'INVALID_PAYLOAD',
          reason
        }),
        'recording invalid RFID event'
      );
      console.error(`[MQTT] RFID event ${scanId} was recorded but cannot be processed: ${reason}`);
      return;
    }

    const normalizedData = {
      ...data,
      id: scanId,
      timestamp: data.timestamp || scan.scannedAt.toISOString()
    };
    let configuredSource;
    try {
      configuredSource = await CameraConfigService.getCameraSource();
    } catch (error) {
      configuredSource = 'desktop';
      console.error('[Camera Config] Could not load saved source; trying desktop then ESP32:', error.message);
    }

    let user = null;
    let capture = scan.image
      ? {
          image: scan.image,
          receivedAt: scan.cameraFrameReceivedAt || scan.updatedAt,
          ageMs: scan.cameraFrameAgeMs || 0,
          cameraSource: scan.cameraSource || configuredSource
        }
      : null;
    let cameraAttempts = 0;
    while (!capture) {
      try {
        capture = await captureScanPhoto(configuredSource);
      } catch (error) {
        console.error(`[Camera] Unexpected capture error for RFID event ${scanId}:`, error.message);
      }

      if (!capture) {
        cameraAttempts++;
        const reason = `Đang chờ camera ${configuredSource} hoặc camera dự phòng; lượt RFID đã được lưu và chưa kết thúc.`;
        await retryDatabaseWrite(
          () => RfidScanEventService.update(scanId, {
            userName: user?.name || 'Unknown',
            cameraSource: configuredSource,
            status: 'CAMERA_RETRYING',
            failureCode: 'CAMERA_UNAVAILABLE',
            reason
          }),
          'recording pending RFID camera capture'
        );
        if (cameraAttempts === 1 || cameraAttempts % 6 === 0) {
          console.warn(`[Camera] RFID event ${scanId} is saved; retrying both camera sources (attempt ${cameraAttempts}).`);
          emitCameraPending({
            ...normalizedData,
            userName: user?.name || 'Unknown',
            cameraSource: configuredSource,
            reason,
            eventPersisted: true
          });
        }
        await delay(Math.min(5000, cameraAttempts * 1000));
      }
    }

    const { image, cameraSource, receivedAt, ageMs } = capture;
    const scanData = { ...normalizedData, cameraSource };
    await retryDatabaseWrite(
      () => RfidScanEventService.update(scanId, {
        userName: user?.name || 'Unknown',
        cameraSource,
        cameraFrameReceivedAt: receivedAt,
        cameraFrameAgeMs: ageMs,
        image,
        status: 'IMAGE_CAPTURED',
        failureCode: null,
        reason: null
      }),
      'saving RFID event image'
    );

    try {
      user = await UserService.getByCardNumber(data.rfid);
    } catch (error) {
      const reason = `Ảnh và sự kiện RFID đã lưu, nhưng không tra cứu được chủ thẻ: ${error.message}`;
      await retryDatabaseWrite(
        () => RfidScanEventService.update(scanId, {
          status: 'USER_LOOKUP_FAILED',
          userName: 'Unknown',
          failureCode: 'USER_LOOKUP_FAILED',
          reason
        }),
        'recording RFID user lookup failure'
      );
      await emitRejectedScan({
        ...scanData,
        userName: 'Unknown',
        reason,
        failureCode: 'USER_LOOKUP_FAILED',
        image,
        imagePersisted: true,
        eventPersisted: true,
        verified: false
      });
      return;
    }

    if (!user) {
      try {
        const savedDoc = await CheckInEventService.saveScan(
          scanData, image, 'client', 'UNASSIGNED_CLIENT', null
        );
        if (!savedDoc) throw new Error('Attendance service returned no saved record.');
        await retryDatabaseWrite(
          () => RfidScanEventService.update(scanId, {
            status: 'UNASSIGNED_RECORDED',
            failureCode: null,
            reason: null
          }),
          'finalizing unassigned RFID event'
        );
        emitCompletedScan({
          ...scanData,
          userName: 'client',
          isCheckOut: !!savedDoc.ispass,
          image,
          verified: false,
          isMatch: null,
          eventPersisted: true
        });
      } catch (error) {
        const reason = `Ảnh và sự kiện RFID đã lưu, nhưng không ghi được chấm công: ${error.message}`;
        await retryDatabaseWrite(
          () => RfidScanEventService.update(scanId, {
            status: 'ATTENDANCE_SAVE_FAILED',
            failureCode: 'ATTENDANCE_SAVE_FAILED',
            reason
          }),
          'recording unassigned attendance failure'
        );
        console.error(`[Database] ${reason}`);
        await emitRejectedScan({
          ...scanData,
          userName: 'client',
          reason,
          failureCode: 'ATTENDANCE_SAVE_FAILED',
          image,
          imagePersisted: true,
          eventPersisted: true,
          verified: false
        });
      }
      return;
    }

    const faceMatchThreshold = 0.4;
    let verifyResult;
    try {
      verifyResult = await faceVerification.verify(user.avatar, image, faceMatchThreshold);
    } catch (error) {
      verifyResult = {
        success: false,
        isMatch: false,
        message: `Face AI không thể xác minh ảnh: ${error.message}`
      };
    }

    if (verifyResult?.success && verifyResult.isMatch) {
      try {
        const savedDoc = await CheckInEventService.saveScan(
          scanData, image, user.name, 'MATCHED', verifyResult.similarity
        );
        if (!savedDoc) throw new Error('Attendance service returned no saved record.');
        await retryDatabaseWrite(
          () => RfidScanEventService.update(scanId, {
            status: 'MATCHED',
            userName: user.name,
            similarity: verifyResult.similarity,
            threshold: verifyResult.threshold ?? faceMatchThreshold,
            failureCode: null,
            reason: null
          }),
          'finalizing matched RFID event'
        );
        emitCompletedScan({
          ...scanData,
          userName: user.name,
          isCheckOut: !!savedDoc.ispass,
          image,
          verified: true,
          isMatch: true,
          similarity: verifyResult.similarity,
          eventPersisted: true
        });
      } catch (error) {
        const reason = `Ảnh và sự kiện RFID đã lưu, nhưng không ghi được chấm công: ${error.message}`;
        await retryDatabaseWrite(
          () => RfidScanEventService.update(scanId, {
            status: 'ATTENDANCE_SAVE_FAILED',
            userName: user.name,
            failureCode: 'ATTENDANCE_SAVE_FAILED',
            reason,
            similarity: verifyResult.similarity,
            threshold: verifyResult.threshold ?? faceMatchThreshold
          }),
          'recording matched attendance failure'
        );
        console.error(`[Database] ${reason}`);
        await emitRejectedScan({
          ...scanData,
          userName: user.name,
          reason,
          failureCode: 'ATTENDANCE_SAVE_FAILED',
          image,
          imagePersisted: true,
          eventPersisted: true,
          verified: false,
          similarity: verifyResult.similarity ?? null
        });
      }
      return;
    }

    const reason = verifyResult.message ||
      (verifyResult.success && Number.isFinite(verifyResult.similarity)
        ? `Độ tương đồng ${(verifyResult.similarity * 100).toFixed(1)}% thấp hơn ngưỡng ${(faceMatchThreshold * 100).toFixed(0)}%.`
        : 'Face AI không thể xác minh ảnh.');
    const failureCode = verifyResult.success ? 'FACE_MISMATCH' : 'FACE_VERIFICATION_FAILED';
    await retryDatabaseWrite(
      () => RfidScanEventService.update(scanId, {
        status: failureCode,
        userName: user.name,
        failureCode,
        reason,
        similarity: Number.isFinite(verifyResult.similarity) ? verifyResult.similarity : null,
        threshold: verifyResult.threshold ?? faceMatchThreshold
      }),
      'recording face verification result'
    );

    try {
      await RejectedScanService.save({
        ...scanData,
        userName: user.name,
        cameraFrameReceivedAt: receivedAt,
        cameraFrameAgeMs: ageMs,
        image,
        failureCode,
        reason,
        similarity: verifyResult.similarity,
        threshold: verifyResult.threshold ?? faceMatchThreshold
      });
    } catch (error) {
      console.error('[Database] RejectedScans mirror write failed; primary RFID event and image are saved:', error.message);
    }

    await emitRejectedScan({
      ...scanData,
      userName: user.name,
      reason,
      failureCode,
      image,
      verified: false,
      isMatch: verifyResult.success ? Boolean(verifyResult.isMatch) : null,
      similarity: Number.isFinite(verifyResult.similarity) ? verifyResult.similarity : null,
      threshold: verifyResult.threshold ?? faceMatchThreshold,
      imagePersisted: true,
      eventPersisted: true
    });
  } catch (error) {
    console.error(`[MQTT] Unexpected RFID processing error for event ${scanId}:`, error.message);
    await retryDatabaseWrite(
      () => RfidScanEventService.update(scanId, {
        status: 'PROCESSING_ERROR',
        failureCode: 'PROCESSING_ERROR',
        reason: error.message
      }),
      'recording RFID processing error'
    );
  } finally {
    processingScans.delete(scanId);
  }
}

client.on('message', (topic, message) => {
  if (topic !== rfidTopic) return;
  const rawPayload = message.toString();
  processRfidScan(rawPayload).catch(error => {
    console.error('[MQTT] Failed to persist received RFID message:', error.message);
  });
});

async function resumePendingScans() {
  try {
    fs.mkdirSync(RFID_INBOX_DIR, { recursive: true });
    for (const fileName of fs.readdirSync(RFID_INBOX_DIR)) {
      if (!fileName.endsWith('.json')) continue;
      const filePath = path.join(RFID_INBOX_DIR, fileName);
      try {
        const entry = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (typeof entry.rawPayload !== 'string') {
          throw new Error('Inbox entry has no raw MQTT payload.');
        }
        processRfidScan(entry.rawPayload, filePath).catch(error => {
          console.error(`[MQTT] Failed to replay local RFID inbox file ${fileName}:`, error.message);
        });
      } catch (error) {
        console.error(`[MQTT] Cannot replay local RFID inbox file ${fileName}:`, error.message);
      }
    }
  } catch (error) {
    console.error('[MQTT] Failed to read local RFID inbox:', error.message);
  }

  const pendingScans = await retryDatabaseWrite(
    () => RfidScanEventService.findPending(),
    'loading pending RFID events'
  );
  for (const scan of pendingScans) {
    processRfidScan(scan.rawPayload).catch(error => {
      console.error(`[MQTT] Failed to resume RFID event ${scan.scanId}:`, error.message);
    });
  }
}

client.on('connect', () => {
  resumePendingScans().catch(error => {
    console.error('[MQTT] Failed to load persisted RFID events:', error.message);
  });
});
