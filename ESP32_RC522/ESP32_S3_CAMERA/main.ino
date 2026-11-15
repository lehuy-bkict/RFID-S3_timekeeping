#include "esp_camera.h"
#include "img_converters.h"
#include <PubSubClient.h>
#include <WiFi.h>

#define WIFI_SSID "@Lhh"
#define WIFI_PASSWORD "12345678"

#define MQTT_HOST "10.160.110.95"
#define MQTT_PORT 1883
#define MQTT_DEVICE_ID "ESP32_CAMERA_01"
#define MQTT_FRAME_TOPIC "esp32/camera/" MQTT_DEVICE_ID "/frame"
#define MQTT_STATUS_TOPIC "esp32/camera/" MQTT_DEVICE_ID "/status"

#define MQTT_BUFFER_SIZE (8 * 1024)  // Đệm 8KB cho cơ chế stream chunked
#define SOFTWARE_JPEG_QUALITY 65     // Ảnh VGA 640x480 rõ nét mặt (~40-50KB)
#define FRAME_INTERVAL_MS 200        // ~4-5 FPS
#define WIFI_RETRY_INTERVAL_MS 5000
#define MQTT_RETRY_INTERVAL_MS 3000

// Pin map ESP32-S3-CAM
#define CAMERA_PIN_PWDN -1
#define CAMERA_PIN_RESET -1
#define CAMERA_PIN_XCLK 15
#define CAMERA_PIN_SIOD 4
#define CAMERA_PIN_SIOC 5
#define CAMERA_PIN_D7 16
#define CAMERA_PIN_D6 17
#define CAMERA_PIN_D5 18
#define CAMERA_PIN_D4 8
#define CAMERA_PIN_D3 10
#define CAMERA_PIN_D2 9
#define CAMERA_PIN_D1 11
#define CAMERA_PIN_D0 12
#define CAMERA_PIN_VSYNC 6
#define CAMERA_PIN_HREF 7
#define CAMERA_PIN_PCLK 13

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

unsigned long lastFrameAt = 0;
unsigned long lastWifiAttemptAt = 0;
unsigned long lastMqttAttemptAt = 0;

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  if (millis() - lastWifiAttemptAt < WIFI_RETRY_INTERVAL_MS) return;

  lastWifiAttemptAt = millis();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

bool connectMQTT() {
  if (WiFi.status() != WL_CONNECTED || mqtt.connected()) {
    return mqtt.connected();
  }
  if (millis() - lastMqttAttemptAt < MQTT_RETRY_INTERVAL_MS) return false;

  lastMqttAttemptAt = millis();
  if (!mqtt.connect(MQTT_DEVICE_ID, MQTT_STATUS_TOPIC, 1, true, "offline")) {
    return false;
  }

  mqtt.publish(MQTT_STATUS_TOPIC, "online", true);
  Serial.println("[MQTT] Connected.");
  return true;
}

bool initializeCamera() {
  if (!psramFound()) {
    Serial.println("[ERROR] Chua bat PSRAM! Hay bat OPI PSRAM trong Tools -> PSRAM.");
    return false;
  }

  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = CAMERA_PIN_D0;
  config.pin_d1 = CAMERA_PIN_D1;
  config.pin_d2 = CAMERA_PIN_D2;
  config.pin_d3 = CAMERA_PIN_D3;
  config.pin_d4 = CAMERA_PIN_D4;
  config.pin_d5 = CAMERA_PIN_D5;
  config.pin_d6 = CAMERA_PIN_D6;
  config.pin_d7 = CAMERA_PIN_D7;
  config.pin_xclk = CAMERA_PIN_XCLK;
  config.pin_pclk = CAMERA_PIN_PCLK;
  config.pin_vsync = CAMERA_PIN_VSYNC;
  config.pin_href = CAMERA_PIN_HREF;
  config.pin_sccb_sda = CAMERA_PIN_SIOD;
  config.pin_sccb_scl = CAMERA_PIN_SIOC;
  config.pin_pwdn = CAMERA_PIN_PWDN;
  config.pin_reset = CAMERA_PIN_RESET;
  config.xclk_freq_hz = 20000000;

  config.pixel_format = PIXFORMAT_RGB565;
  config.frame_size = FRAMESIZE_VGA; // 640x480
  config.jpeg_quality = 12;
  config.fb_count = 2;
  config.fb_location = CAMERA_FB_IN_PSRAM;
  config.grab_mode = CAMERA_GRAB_LATEST;

  if (esp_camera_init(&config) != ESP_OK) {
    Serial.println("[Camera] Init failed!");
    return false;
  }

  sensor_t *s = esp_camera_sensor_get();
  if (s != nullptr) {
    s->set_contrast(s, 1);
    s->set_sharpness(s, 2);
    s->set_whitebal(s, 1);
    s->set_awb_gain(s, 1);
    s->set_exposure_ctrl(s, 1);
    s->set_gainceiling(s, (gainceiling_t)4);
  }
  return true;
}

void publishFrame() {
  if (!mqtt.connected() || (millis() - lastFrameAt < FRAME_INTERVAL_MS)) {
    return;
  }

  unsigned long t0 = millis();
  camera_fb_t *frame = esp_camera_fb_get();
  if (frame == nullptr) return;

  uint8_t *jpegBuffer = nullptr;
  size_t jpegLength = 0;
  const bool converted = frame2jpg(frame, SOFTWARE_JPEG_QUALITY, &jpegBuffer, &jpegLength);

  esp_camera_fb_return(frame);
  lastFrameAt = millis();

  if (!converted || jpegBuffer == nullptr || jpegLength == 0) {
    if (jpegBuffer != nullptr) free(jpegBuffer);
    return;
  }

  // Đẩy thẳng byte JPEG lên MQTT (vượt giới hạn 64KB của PubSubClient)
  bool ok = mqtt.beginPublish(MQTT_FRAME_TOPIC, jpegLength, false);
  if (ok) {
    size_t sent = 0;
    while (sent < jpegLength) {
      size_t toSend = min((size_t)4096, jpegLength - sent);
      size_t written = mqtt.write(jpegBuffer + sent, toSend);
      if (written == 0) {
        ok = false;
        break;
      }
      sent += written;
    }
    ok = mqtt.endPublish() && ok;
  }

  free(jpegBuffer);

  if (ok) {
    Serial.printf("[MQTT] Sent JPEG: %u bytes | %lu ms\n", jpegLength, millis() - t0);
  } else {
    Serial.println("[MQTT] Publish failed!");
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);

  if (!initializeCamera()) {
    while (true) delay(1000);
  }

  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.setAutoReconnect(true);

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setBufferSize(MQTT_BUFFER_SIZE);
  mqtt.setSocketTimeout(15);
  mqtt.setKeepAlive(60);
  connectWiFi();
}

void loop() {
  connectWiFi();
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqtt.connected()) {
      connectMQTT();
    } else {
      mqtt.loop();
      publishFrame();
    }
  }
}