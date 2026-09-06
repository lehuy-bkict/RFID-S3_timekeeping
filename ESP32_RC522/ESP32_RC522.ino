#include <PubSubClient.h>
#include <WiFi.h>
#include <SPI.h>
#include <MFRC522.h>
#include <time.h>
#define RST_PIN 22
#define SS_PIN 5

MFRC522 mfrc522(SS_PIN, RST_PIN);

const char* ssid = "Lhhuy";
const char* password = "0961163347";
const char* ssid_backup = "APS LAB";
const char* password_backup = "Vim#0343222666";
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
  // Connect to primary Wi-Fi
  Serial.print("Connecting to primary WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);

  unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < 15000) {
    delay(500);
    Serial.print(".");
  }

  // Fall back to secondary Wi-Fi if primary connection fails
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\nFailed to connect to primary WiFi. Connecting to backup WiFi: ");
    Serial.println(ssid_backup);
    WiFi.disconnect();
    delay(500);
    WiFi.begin(ssid_backup, password_backup);

    startedAt = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startedAt < 15000) {
      delay(500);
      Serial.print(".");
    }
  }

  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi Connected to: ");
    Serial.println(WiFi.SSID());
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Could not connect to any WiFi network!");
  }
}

void reconnect() {
  while (!client.connected()) {
    if (WiFi.status() != WL_CONNECTED) {
      setup_wifi();
      if (WiFi.status() != WL_CONNECTED) {
        delay(2000);
        continue;
      }
    }
    if (client.connect("ESP32Client")) {
      Serial.println("MQTT connected");
      break;
    }
    delay(2000);
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
