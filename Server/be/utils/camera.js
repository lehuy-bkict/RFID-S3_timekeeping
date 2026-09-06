'use strict';

const NodeWebcam = require('node-webcam');
const sharp = require('sharp');
const bmp = require('bmp-js');
const fs = require('fs');
const path = require('path');
const os = require('os');

const axios = require('axios');
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5000';

const jpegQuality = Math.min(95, Math.max(10, Number(process.env.CAMERA_JPEG_QUALITY || 40)));

// Default webcam configuration
const webcamOptions = {
  width: 1280,
  height: 720,
  quality: 80,
  output: 'jpeg',
  callbackReturn: 'location',
  verbose: false
};

const Webcam = NodeWebcam.create(webcamOptions);

/**
 * Fallback snapshot using node-webcam
 */
function captureLegacyPhotoBase64() {
  return new Promise((resolve) => {
    const tempFileName = path.join(os.tmpdir(), `rfid_cam_${Date.now()}`);

    Webcam.capture(tempFileName, async (err, capturedPath) => {
      // Find actual captured file path (.jpg or .bmp or location returned)
      let actualPath = capturedPath;
      if (!actualPath || !fs.existsSync(actualPath)) {
        if (fs.existsSync(`${tempFileName}.jpg`)) {
          actualPath = `${tempFileName}.jpg`;
        } else if (fs.existsSync(`${tempFileName}.bmp`)) {
          actualPath = `${tempFileName}.bmp`;
        }
      }

      if (err || !actualPath || !fs.existsSync(actualPath)) {
        console.error('📷 Camera capture error:', err ? (err.message || err) : 'File not found');
        return resolve(null);
      }

      try {
        const rawBuffer = fs.readFileSync(actualPath);
        let sharpInput;

        // Check if file has BMP header ('BM' / 0x42 0x4D)
        if (rawBuffer.length > 2 && rawBuffer[0] === 0x42 && rawBuffer[1] === 0x4d) {
          const bmpData = bmp.decode(rawBuffer);
          sharpInput = sharp(bmpData.data, {
            raw: {
              width: bmpData.width,
              height: bmpData.height,
              channels: 4
            }
          });
        } else {
          sharpInput = sharp(rawBuffer);
        }

        // Resize image to width 640px preserving aspect ratio and high quality for AI face verification
        const compressedBuffer = await sharpInput
          .rotate()
          .resize(640, null, { withoutEnlargement: true })
          .jpeg({ quality: 90, progressive: true })
          .toBuffer();

        const base64Data = `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
        return resolve(base64Data);
      } catch (procErr) {
        console.error('📷 Image compression error:', procErr.message || procErr);
        return resolve(null);
      } finally {
        // Clean up temporary snapshot file
        if (actualPath && fs.existsSync(actualPath)) {
          fs.unlink(actualPath, () => {});
        }
      }
    });
  });
}

/**
 * Captures a photo using the server's open camera via AI service, with legacy fallback.
 * @returns {Promise<string|null>}
 */
async function capturePhotoBase64() {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/camera/snapshot`, { timeout: 2000 });
    if (response?.data?.success && response.data.image) {
      return response.data.image;
    }
  } catch (err) {
    // AI service camera snapshot unavailable, fallback
  }
  return captureLegacyPhotoBase64();
}

module.exports = {
  capturePhotoBase64
};
