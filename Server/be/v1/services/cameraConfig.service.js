'use strict';

const { ConfigModel } = require('../../database_model/modelConfig');

const CAMERA_CONFIG_KEY = 'attendanceCameraSource';
const VALID_CAMERA_SOURCES = new Set(['desktop', 'esp32']);

class CameraConfigService {
  async getCameraSource() {
    const config = await ConfigModel.findOne({ key: CAMERA_CONFIG_KEY }).lean();
    const cameraSource = config?.value || 'desktop';
    if (!VALID_CAMERA_SOURCES.has(cameraSource)) {
      throw new Error(`Invalid saved attendance camera source: ${cameraSource}`);
    }
    return cameraSource;
  }

  async saveCameraSource(cameraSource) {
    if (!VALID_CAMERA_SOURCES.has(cameraSource)) {
      throw new TypeError('Nguồn camera không hợp lệ.');
    }

    return ConfigModel.findOneAndUpdate(
      { key: CAMERA_CONFIG_KEY },
      {
        $set: {
          value: cameraSource,
          updatedAt: new Date()
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
  }
}

module.exports = {
  CameraConfigService: new CameraConfigService(),
  VALID_CAMERA_SOURCES
};
