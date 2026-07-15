#include <WiFi.h>
#include <PubSubClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <time.h>
#define RST_PIN 22
#define SS_PIN 5

MFRC522 mfrc522(SS_PIN, RST_PIN);

const char* ssid = "Lhhuy";
const char* password = "0961163347";
const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;
const char* mqtt_topic = "esp32/rfid/data";

WiFiClient espClient;
PubSubClient client(espClient);
String deviceID = "ESP32_01";

String getCurrentTime() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "null";
  }
  char buffer[30];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%S", &timeinfo);
  return String(buffer);
}

void setup_wifi() {
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
}

void reconnect() {
  while (!client.connected()) {
    client.connect("ESP32Client");
  }
}

void setup() {
  Serial.begin(115200);
  SPI.begin(18, 19, 23);  
  mfrc522.PCD_Init();

  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);

  configTime(7 * 3600, 0, "pool.ntp.org", "time.nist.gov");
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  unsigned long uidDec = 0;
  for (byte i = mfrc522.uid.size; i > 0; i--) {
    uidDec = (uidDec << 8) | mfrc522.uid.uidByte[i - 1];
  }

  char uidStr[11];
  sprintf(uidStr, "%010lu", uidDec);
  String rfidTag = String(uidStr);

  String timestamp = getCurrentTime();

  String payload = "{\"rfid\":\"" + rfidTag + "\",\"timestamp\":\"" + timestamp + "\",\"device\":\"" + deviceID + "\"}";
  Serial.println(payload);
  client.publish(mqtt_topic, payload.c_str());

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
}
