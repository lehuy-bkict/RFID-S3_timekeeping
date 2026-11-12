#pragma once

static const char* const WIFI_SSID = "@Lhh";
static const char* const WIFI_PASSWORD = "12345678";

static const char* const MQTT_HOST = "10.51.249.95";
static const uint16_t MQTT_PORT = 1883;
static const char* const MQTT_CAMERA_FRAME_TOPIC = "esp32/camera/frame";
static const char* const MQTT_CAMERA_STATUS_TOPIC = "esp32/camera/status";

static const char* const OTA_HOSTNAME = "esp32-rfid-cam";

// Freenova ESP32-S3-CAM camera pins
constexpr int PWDN_GPIO_NUM = -1;
constexpr int RESET_GPIO_NUM = -1;
constexpr int XCLK_GPIO_NUM = 15;
constexpr int SIOD_GPIO_NUM = 4;
constexpr int SIOC_GPIO_NUM = 5;
constexpr int Y9_GPIO_NUM = 16;
constexpr int Y8_GPIO_NUM = 17;
constexpr int Y7_GPIO_NUM = 18;
constexpr int Y6_GPIO_NUM = 12;
constexpr int Y5_GPIO_NUM = 10;
constexpr int Y4_GPIO_NUM = 8;
constexpr int Y3_GPIO_NUM = 9;
constexpr int Y2_GPIO_NUM = 11;
constexpr int VSYNC_GPIO_NUM = 6;
constexpr int HREF_GPIO_NUM = 7;
constexpr int PCLK_GPIO_NUM = 13;

constexpr uint32_t WIFI_RETRY_INTERVAL_MS = 15000;
constexpr uint32_t MQTT_RETRY_INTERVAL_MS = 5000;
constexpr uint32_t CAMERA_PUBLISH_INTERVAL_MS = 250;
constexpr int MQTT_BUFFER_SIZE = 16384;