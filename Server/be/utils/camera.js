'use strict';

const NodeWebcam = require('node-webcam');
const sharp = require('sharp');
const bmp = require('bmp-js');
const fs = require('fs');
const path = require('path');
const os = require('os');

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
 * Captures a photo using the server's connected webcam, compresses it to ~10-20KB,
 * and returns it as a lightweight Base64 string.
 * @returns {Promise<string|null>} Compressed Base64 image string (data:image/jpeg;base64,...) or null if capture fails
 */
function capturePhotoBase64() {
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

        // Resize & compress JPEG image to 480px width, quality 45 (~10KB - 20KB Base64 size)
        const compressedBuffer = await sharpInput
          .resize({ width: 480, withoutEnlargement: true })
          .jpeg({ quality: 45, progressive: true })
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

module.exports = {
  capturePhotoBase64
};
