#include <MFRC522.h>
#include <Preferences.h>
#include <SPI.h>
#include <WiFi.h>
#include <esp_event.h>
#include <mqtt_client.h>
#include <time.h>

#include "../include/device_config.h"

#define SS_PIN 5
#define RST_PIN 22
#define SCK_PIN 18
#define MISO_PIN 19
#define MOSI_PIN 23

constexpr size_t MAX_QUEUE_RECORDS = 24;
constexpr size_t MAX_QUEUE_BYTES = 3500;
constexpr uint32_t WIFI_RETRY_INTERVAL_MS = 15000;
constexpr uint32_t MQTT_RETRY_INTERVAL_MS = 5000;
constexpr uint32_t DUPLICATE_SCAN_WINDOW_MS = 1500;

MFRC522 rfidReader(SS_PIN, RST_PIN);
Preferences preferences;

bool storageReady = false;
uint32_t lastWifiAttemptAt = 0;
uint32_t lastMqttAttemptAt = 0;
esp_mqtt_client_handle_t mqttClient = nullptr;
volatile bool mqttConnected = false;
volatile bool mqttAckReceived = false;
volatile int inFlightMessageId = -1;
volatile int lastPublishedMessageId = -1;
String mqttClientId;
String lastScannedUid;
uint32_t lastScanAt = 0;

size_t countQueueRecords(const String& queue) {
  if (queue.isEmpty()) {
    return 0;
  }

  size_t records = 1;
  for (size_t i = 0; i < queue.length(); i++) {
    if (queue[i] == '\n') {
      records++;
    }
  }
  return records;
}

bool appendToQueue(const String& payload) {
  if (!storageReady) {
    Serial.println("[NVS] Storage unavailable; scan was not queued.");
    return false;
  }

  String queue = preferences.getString("queue", "");
  if (countQueueRecords(queue) >= MAX_QUEUE_RECORDS ||
      queue.length() + payload.length() + (queue.isEmpty() ? 0 : 1) >
          MAX_QUEUE_BYTES) {
    Serial.println("[NVS] Queue full; scan was not queued.");
    return false;
  }

  if (!queue.isEmpty()) {
    queue += '\n';
  }
  queue += payload;
  if (preferences.putString("queue", queue) == 0) {
    Serial.println("[NVS] Failed to save scan to flash.");
    return false;
  }
  return true;
}

void mqttEventHandler(void* handlerArgs, esp_event_base_t eventBase,
                      int32_t eventId, void* eventData) {
  (void)handlerArgs;
  (void)eventBase;
  esp_mqtt_event_handle_t event =
      static_cast<esp_mqtt_event_handle_t>(eventData);

  if (eventId == MQTT_EVENT_CONNECTED) {
    mqttConnected = true;
    Serial.println("[MQTT] Connected.");
  } else if (eventId == MQTT_EVENT_DISCONNECTED) {
    mqttConnected = false;
    Serial.println("[MQTT] Disconnected; scans remain in flash.");
  } else if (eventId == MQTT_EVENT_PUBLISHED) {
    lastPublishedMessageId = event->msg_id;
    if (event->msg_id == inFlightMessageId) {
      mqttAckReceived = true;
      Serial.printf("[MQTT] Broker acknowledged message id %d.\n",
                    event->msg_id);
    }
  } else if (eventId == MQTT_EVENT_ERROR) {
    Serial.println("[MQTT] Connection or transport error.");
  }
}

void startMqttClient() {
  mqttClientId = "ESP32-WROOM-" +
                 String(static_cast<uint32_t>(ESP.getEfuseMac()), HEX);
  String mqttUri = "mqtt://" + String(MQTT_HOST);

  esp_mqtt_client_config_t config = {};
  config.uri = mqttUri.c_str();
  config.port = MQTT_PORT;
  config.client_id = mqttClientId.c_str();
  config.keepalive = 60;

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

void publishQueueHead() {
  if (!storageReady || !mqttConnected || mqttClient == nullptr ||
      inFlightMessageId >= 0 || mqttAckReceived) {
    return;
  }

  String queue = preferences.getString("queue", "");
  if (queue.isEmpty()) {
    return;
  }

  int separator = queue.indexOf('\n');
  String payload = separator < 0 ? queue : queue.substring(0, separator);
  lastPublishedMessageId = -1;
  int messageId = esp_mqtt_client_enqueue(
      mqttClient, MQTT_TOPIC, payload.c_str(), payload.length(), 1, 0, true);
  if (messageId < 0) {
    Serial.println("[MQTT] Publish failed; scan remains queued.");
    return;
  }

  inFlightMessageId = messageId;
  if (lastPublishedMessageId == messageId) {
    mqttAckReceived = true;
  }
  Serial.printf("[MQTT] Queued scan with QoS 1; waiting for PUBACK, message id %d.\n",
                messageId);
}

void processAcknowledgedMessage() {
  if (!mqttAckReceived || !storageReady) {
    return;
  }

  static uint32_t lastRemovalAttemptAt = 0;
  if (millis() - lastRemovalAttemptAt < 1000) {
    return;
  }
  lastRemovalAttemptAt = millis();

  String queue = preferences.getString("queue", "");
  int separator = queue.indexOf('\n');
  String remaining = separator < 0 ? "" : queue.substring(separator + 1);
  const bool queueUpdated = remaining.isEmpty()
      ? preferences.remove("queue")
      : preferences.putString("queue", remaining) == remaining.length();
  if (!queueUpdated) {
    Serial.println("[NVS] Failed to remove acknowledged scan from queue.");
    return;
  }

  Serial.println("[MQTT] PUBACK received; removed scan from flash queue.");
  mqttAckReceived = false;
  inFlightMessageId = -1;
  lastPublishedMessageId = -1;
}

void maintainConnections() {
  uint32_t now = millis();
  if (WiFi.status() != WL_CONNECTED &&
      now - lastWifiAttemptAt >= WIFI_RETRY_INTERVAL_MS) {
    lastWifiAttemptAt = now;
    Serial.printf("[WiFi] Connecting to %s\n", WIFI_SSID);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }

  if (WiFi.status() == WL_CONNECTED && mqttClient == nullptr &&
      now - lastMqttAttemptAt >= MQTT_RETRY_INTERVAL_MS) {
    lastMqttAttemptAt = now;
    Serial.printf("[MQTT] Connecting to %s:%u\n", MQTT_HOST, MQTT_PORT);
    startMqttClient();
  }

  processAcknowledgedMessage();
  publishQueueHead();
}

String getCurrentTime() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo, 100)) {
    return "null";
  }

  char buffer[30];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%S", &timeinfo);
  return String(buffer);
}

String formatUid() {
  uint64_t uidValue = 0;
  for (byte i = rfidReader.uid.size; i > 0; i--) {
    uidValue = (uidValue << 8) | rfidReader.uid.uidByte[i - 1];
  }

  char uidBuffer[21];
  snprintf(uidBuffer, sizeof(uidBuffer), "%010llu",
           static_cast<unsigned long long>(uidValue));
  return String(uidBuffer);
}

void queueRfidScan(const String& uid) {
  if (!storageReady) {
    Serial.println("[NVS] Storage unavailable; scan was not queued.");
    return;
  }

  uint32_t sequence = preferences.getUInt("sequence", 0) + 1;
  if (preferences.putUInt("sequence", sequence) == 0) {
    Serial.println("[NVS] Failed to update event sequence; scan not queued.");
    return;
  }

  char eventIdBuffer[32];
  snprintf(eventIdBuffer, sizeof(eventIdBuffer), "%012llX-%lu",
           static_cast<unsigned long long>(
               ESP.getEfuseMac() & 0xFFFFFFFFFFFFULL),
           static_cast<unsigned long>(sequence));
  String payload = "{\"id\":\"" + String(eventIdBuffer) +
                   "\",\"rfid\":\"" + uid + "\",\"timestamp\":\"" +
                   getCurrentTime() + "\",\"device\":\"" + DEVICE_ID + "\"}";

  if (appendToQueue(payload)) {
    Serial.println("[RFID] Scan saved to the MQTT queue.");
  }
}

void setup() {
  Serial.begin(115200);
  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN);
  rfidReader.PCD_Init();

  storageReady = preferences.begin("rfid_queue", false);
  if (!storageReady) {
    Serial.println("[NVS] Failed to initialize persistent scan queue.");
  }

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  lastWifiAttemptAt = millis();
  configTime(7 * 3600, 0, "pool.ntp.org", "time.nist.gov");
  maintainConnections();

  Serial.println("[RFID] ESP32-WROOM reader ready.");
}

void loop() {
  maintainConnections();

  if (!rfidReader.PICC_IsNewCardPresent() ||
      !rfidReader.PICC_ReadCardSerial()) {
    delay(5);
    return;
  }

  String uid = formatUid();
  uint32_t now = millis();
  if (uid != lastScannedUid ||
      now - lastScanAt >= DUPLICATE_SCAN_WINDOW_MS) {
    Serial.printf("[RFID] Card read: %s\n", uid.c_str());
    queueRfidScan(uid);
    lastScannedUid = uid;
    lastScanAt = now;
  }

  rfidReader.PICC_HaltA();
  rfidReader.PCD_StopCrypto1();
}
