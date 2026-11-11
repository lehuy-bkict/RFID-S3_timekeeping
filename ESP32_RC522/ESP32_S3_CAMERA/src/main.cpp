#include <ArduinoOTA.h>
#include "esp_camera.h"
#include <esp_event.h>
#include <mqtt_client.h>
#include <WiFi.h>

#ifndef OTA_PASSWORD
#define OTA_PASSWORD ""
#endif

// Freenova ESP32-S3-CAM camera pins
#define PWDN_GPIO_NUM -1
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM 15
#define SIOD_GPIO_NUM 4
#define SIOC_GPIO_NUM 5
#define Y9_GPIO_NUM 16
#define Y8_GPIO_NUM 17
#define Y7_GPIO_NUM 18
#define Y6_GPIO_NUM 12
#define Y5_GPIO_NUM 10
#define Y4_GPIO_NUM 8
#define Y3_GPIO_NUM 9
#define Y2_GPIO_NUM 11
#define VSYNC_GPIO_NUM 6
#define HREF_GPIO_NUM 7
#define PCLK_GPIO_NUM 13

const char* ssid = "@Lhh";
const char* password = "12345678";
const char* mqttBrokerUri = "mqtt://10.174.100.95";
const int mqttPort = 1883;
const char* cameraFrameTopic = "esp32/camera/frame";
const char* cameraStatusTopic = "esp32/camera/status";

constexpr uint32_t WIFI_RETRY_INTERVAL_MS = 15000;
constexpr uint32_t MQTT_RETRY_INTERVAL_MS = 5000;
constexpr uint32_t CAMERA_PUBLISH_INTERVAL_MS = 250;
constexpr int MQTT_BUFFER_SIZE = 16384;

uint32_t wifiAttemptStartedAt = 0;
uint32_t mqttLastStartAttemptAt = 0;
uint32_t lastCameraPublishAt = 0;
uint32_t lastCameraPublishLogAt = 0;
bool wifiWasConnected = false;
bool cameraInitialized = false;
bool otaStarted = false;
esp_mqtt_client_handle_t mqttClient = nullptr;
volatile bool mqttConnected = false;
String mqttClientId;

bool initCamera() {
  camera_config_t config = {};
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 10000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = ESP.getPsramSize() > 0 ? FRAMESIZE_QVGA : FRAMESIZE_QQVGA;
  config.jpeg_quality = ESP.getPsramSize() > 0 ? 12 : 20;
  config.fb_count = ESP.getPsramSize() > 0 ? 2 : 1;
  config.fb_location =
      ESP.getPsramSize() > 0 ? CAMERA_FB_IN_PSRAM : CAMERA_FB_IN_DRAM;
  config.grab_mode = CAMERA_GRAB_LATEST;

  esp_err_t result = esp_camera_init(&config);
  if (result != ESP_OK && config.fb_location == CAMERA_FB_IN_PSRAM) {
    Serial.printf("[Camera] PSRAM init failed (0x%x), retrying with DRAM.\n",
                  result);
    esp_camera_deinit();
    config.frame_size = FRAMESIZE_QQVGA;
    config.jpeg_quality = 20;
    config.fb_count = 1;
    config.fb_location = CAMERA_FB_IN_DRAM;
    result = esp_camera_init(&config);
  }

  if (result != ESP_OK) {
    Serial.printf("[Camera] Initialization failed: 0x%x\n", result);
    return false;
  }

  Serial.println("[Camera] Initialized.");
  return true;
}

void beginNextWifiAttempt() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.disconnect();
  Serial.print("[WiFi] Connecting to: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  wifiAttemptStartedAt = millis();
}

void mqttEventHandler(void* handlerArgs, esp_event_base_t eventBase,
                      int32_t eventId, void* eventData) {
  (void)handlerArgs;
  (void)eventBase;
  (void)eventData;

  if (eventId == MQTT_EVENT_CONNECTED) {
    mqttConnected = true;
    Serial.println("[MQTT] Connected to broker.");
    int messageId = esp_mqtt_client_enqueue(
        mqttClient, cameraStatusTopic, "online", 6, 1, 1, true);
    if (messageId < 0) {
      Serial.println("[MQTT] Failed to publish camera online status.");
    }
  } else if (eventId == MQTT_EVENT_DISCONNECTED) {
    mqttConnected = false;
    Serial.println("[MQTT] Disconnected from broker; reconnecting.");
  } else if (eventId == MQTT_EVENT_ERROR) {
    Serial.println("[MQTT] Connection or transport error.");
  }
}

void startMqttClient() {
  mqttClientId = "ESP32-S3-CAMERA-" +
                 String(static_cast<uint32_t>(ESP.getEfuseMac()), HEX);

  esp_mqtt_client_config_t config = {};
  config.uri = mqttBrokerUri;
  config.port = mqttPort;
  config.client_id = mqttClientId.c_str();
  config.keepalive = 60;
  config.buffer_size = MQTT_BUFFER_SIZE;
  config.out_buffer_size = MQTT_BUFFER_SIZE;
  config.lwt_topic = cameraStatusTopic;
  config.lwt_msg = "offline";
  config.lwt_msg_len = 7;
  config.lwt_qos = 1;
  config.lwt_retain = 1;

  mqttClient = esp_mqtt_client_init(&config);
  if (mqttClient == nullptr) {
    Serial.println("[MQTT] Failed to initialize client.");
    return;
  }

  esp_err_t result = esp_mqtt_client_register_event(
      mqttClient, MQTT_EVENT_ANY, mqttEventHandler, nullptr);
  if (result != ESP_OK) {
    Serial.printf("[MQTT] Failed to register event handler: %s\n",
                  esp_err_to_name(result));
    esp_mqtt_client_destroy(mqttClient);
    mqttClient = nullptr;
    return;
  }

  result = esp_mqtt_client_start(mqttClient);
  if (result != ESP_OK) {
    Serial.printf("[MQTT] Failed to start client: %s\n",
                  esp_err_to_name(result));
    esp_mqtt_client_destroy(mqttClient);
    mqttClient = nullptr;
  }
}

void publishCameraFrame() {
  if (!cameraInitialized || !mqttConnected ||
      millis() - lastCameraPublishAt < CAMERA_PUBLISH_INTERVAL_MS) {
    return;
  }
  lastCameraPublishAt = millis();

  camera_fb_t* frame = esp_camera_fb_get();
  if (frame == nullptr) {
    Serial.println("[Camera] Failed to capture frame.");
    return;
  }

  if (frame->format != PIXFORMAT_JPEG) {
    Serial.println("[Camera] Captured frame is not JPEG; skipping publish.");
    esp_camera_fb_return(frame);
    return;
  }

  int messageId = esp_mqtt_client_publish(
      mqttClient, cameraFrameTopic,
      reinterpret_cast<const char*>(frame->buf), frame->len, 0, 0);
  if (messageId < 0 &&
      millis() - lastCameraPublishLogAt >= 4000) {
    Serial.printf("[MQTT] Camera frame publish failed (size: %u bytes).\n",
                  static_cast<unsigned int>(frame->len));
    lastCameraPublishLogAt = millis();
  } else if (messageId >= 0 &&
             millis() - lastCameraPublishLogAt >= 4000) {
    Serial.printf("[MQTT] Camera frame published (size: %u bytes, id: %d).\n",
                  static_cast<unsigned int>(frame->len), messageId);
    lastCameraPublishLogAt = millis();
  }
  esp_camera_fb_return(frame);
}

void maintainWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!wifiWasConnected) {
      Serial.print("[WiFi] Connected to: ");
      Serial.println(WiFi.SSID());
      Serial.print("[WiFi] IP: ");
      Serial.println(WiFi.localIP());
      wifiWasConnected = true;
    }

    if (mqttClient == nullptr &&
        (mqttLastStartAttemptAt == 0 ||
         millis() - mqttLastStartAttemptAt >= MQTT_RETRY_INTERVAL_MS)) {
      mqttLastStartAttemptAt = millis();
      startMqttClient();
    }

    if (!otaStarted) {
      if (strlen(OTA_PASSWORD) < 12) {
        Serial.println("[OTA] Disabled: set OTA_PASSWORD to at least 12 characters and reflash.");
      } else {
        ArduinoOTA.setHostname("esp32-rfid-cam");
        ArduinoOTA.setPassword(OTA_PASSWORD);
        ArduinoOTA.onStart([]() {
          Serial.println("[OTA] Firmware update started.");
        });
        ArduinoOTA.onEnd([]() {
          Serial.println("\n[OTA] Firmware update complete.");
        });
        ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
          Serial.printf("[OTA] Progress: %u%%\r",
                        (progress * 100U) / total);
        });
        ArduinoOTA.onError([](ota_error_t error) {
          Serial.printf("[OTA] Update failed, error %u.\n", error);
        });
        ArduinoOTA.begin();
        otaStarted = true;
        Serial.print("[OTA] Ready at esp32-rfid-cam.local (");
        Serial.print(WiFi.localIP());
        Serial.println(").");
      }
    }
    return;
  }

  wifiWasConnected = false;
  if (millis() - wifiAttemptStartedAt >= WIFI_RETRY_INTERVAL_MS) {
    Serial.println("[WiFi] Connection timed out; retrying @Lhh.");
    beginNextWifiAttempt();
  }
}

void setup() {
  Serial.begin(115200);
  cameraInitialized = initCamera();
  beginNextWifiAttempt();
}

void loop() {
  maintainWifi();
  if (otaStarted) {
    ArduinoOTA.handle();
  }
  publishCameraFrame();
  delay(10);
}
