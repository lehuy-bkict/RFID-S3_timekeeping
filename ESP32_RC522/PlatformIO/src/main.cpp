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
const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;
const char* mqtt_topic = "esp32/rfid/data";

WiFiClient espClient;
PubSubClient client(espClient);
String deviceID = "ESP32_01";
String mqttClientId;

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
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.config(INADDR_NONE, INADDR_NONE, INADDR_NONE,
              IPAddress(8, 8, 8, 8), IPAddress(1, 1, 1, 1));
  WiFi.begin(ssid, password);

  unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < 20000) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("DNS: ");
    Serial.println(WiFi.dnsIP());
  } else {
    Serial.print("WiFi connection failed, status: ");
    Serial.println(WiFi.status());
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

    Serial.print("Resolving MQTT broker: ");
    Serial.println(mqtt_server);
    IPAddress brokerIP;
    if (WiFi.hostByName(mqtt_server, brokerIP) != 1) {
      Serial.println("DNS lookup failed");
      delay(2000);
      continue;
    }
    Serial.print("MQTT broker IP: ");
    Serial.println(brokerIP);

    if (client.connect(mqttClientId.c_str())) {
      Serial.println("MQTT connected");
      break;
    }
    Serial.print("MQTT connection failed, state: ");
    Serial.println(client.state());
    delay(2000);
  }
}

void setup() {
  Serial.begin(115200);
  SPI.begin(18, 19, 23);  
  mfrc522.PCD_Init();

  mqttClientId = "ESP32Client-" + String((uint32_t)ESP.getEfuseMac(), HEX);

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
  if (client.publish(mqtt_topic, payload.c_str())) {
    Serial.println("RFID published");
  } else {
    Serial.print("RFID publish failed, MQTT state: ");
    Serial.println(client.state());
  }

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
}
