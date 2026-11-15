
#include <MFRC522.h>
#include <PubSubClient.h>
#include <SPI.h>
#include <WiFi.h>
#include <time.h>


// WiFi
#define WIFI_SSID "@Lhh"
#define WIFI_PASSWORD "12345678"

// MQTT
#define MQTT_HOST "10.51.249.95"
#define MQTT_PORT 1883
#define MQTT_TOPIC "esp32/rfid/data"

// RFID pins
#define SS_PIN 5
#define RST_PIN 22

MFRC522 rfid(SS_PIN, RST_PIN);

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

#define DEVICE_ID "ESP32_RFID_01"

String lastUID = "";
unsigned long lastScan = 0;

void connectMQTT() {
  while (!mqtt.connected()) {
    if (mqtt.connect(DEVICE_ID)) {
      Serial.println("[MQTT] Connected");
    } else {
      Serial.println("[MQTT] Reconnecting...");
      delay(2000);
    }
  }
}

String getTimestamp() {
  struct tm timeinfo;

  if (!getLocalTime(&timeinfo, 100)) {
    return "null";
  }

  char buffer[30];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%S", &timeinfo);

  return String(buffer);
}

String formatUID() {
  String uid = "";

  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) {
      uid += "0";
    }

    uid += String(rfid.uid.uidByte[i], HEX);
  }

  uid.toUpperCase();
  return uid;
}

void setup() {
  Serial.begin(115200);

  SPI.begin(18, 19, 23, SS_PIN);
  rfid.PCD_Init();

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("[WiFi] Connecting");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n[WiFi] Connected");

  configTime(7 * 3600, 0, "pool.ntp.org", "time.nist.gov");

  mqtt.setServer(MQTT_HOST, MQTT_PORT);

  connectMQTT();

  Serial.println("[RFID] Ready to scan");
}

void loop() {
  if (!mqtt.connected()) {
    connectMQTT();
  }

  mqtt.loop();

  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    return;
  }

  String uid = formatUID();

  // Chống đọc lặp trong 1.5 giây
  if (uid != lastUID || millis() - lastScan >= 1500) {

    static unsigned long sequence = 0;
    sequence++;

    String eventId =
        String((uint32_t)ESP.getEfuseMac(), HEX) + "-" + String(sequence);

    String payload = "{\"id\":\"" + eventId + "\",\"rfid\":\"" + uid +
                     "\",\"timestamp\":\"" + getTimestamp() +
                     "\",\"device\":\"" + DEVICE_ID + "\"}";

    mqtt.publish(MQTT_TOPIC, payload.c_str());

    Serial.println("[MQTT] Published:");
    Serial.println(payload);

    lastUID = uid;
    lastScan = millis();
  }

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}
