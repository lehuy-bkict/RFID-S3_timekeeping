#include <MFRC522.h>
#include <PubSubClient.h>
#include <SPI.h>
#include <WiFi.h>
#include <time.h>

// ESP32-S3 Consecutive Pinout for RC522 (Straight wiring: SDA->10, SCK->11, MOSI->12, MISO->13, RST->14)
#define RST_PIN   14
#define SS_PIN    10
#define SCK_PIN   11
#define MOSI_PIN  12
#define MISO_PIN  13

MFRC522 mfrc522(SS_PIN, RST_PIN);

const char* ssid = "Lhhuy";
const char* password = "0961163347";
const char* id_backup = "@Lhh";
const char* pass_backup = "12345678";
const char* ssid_backup = "APS LAB";
const char* password_backup = "Vim#0343222666";
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

  struct WifiNetwork {
    const char* ssid;
    const char* password;
  };

  WifiNetwork networks[] = {
    {ssid, password},
    {id_backup, pass_backup},
    {ssid_backup, password_backup}
  };

  const int total_networks = sizeof(networks) / sizeof(networks[0]);

  for (int i = 0; i < total_networks; i++) {
    Serial.println();
    Serial.print("[WiFi] Dang thu ket noi (");
    Serial.print(i + 1);
    Serial.print("/");
    Serial.print(total_networks);
    Serial.print("): ");
    Serial.println(networks[i].ssid);

    WiFi.disconnect();
    delay(500);
    WiFi.begin(networks[i].ssid, networks[i].password);

    unsigned long startedAt = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startedAt < 15000) {
      delay(500);
      Serial.print(".");
    }

    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\n[WiFi] Ket noi thanh cong!");
      break;
    } else {
      Serial.print("\n[WiFi] Khong the ket noi toi: ");
      Serial.println(networks[i].ssid);
    }
  }

  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi Connected to: ");
    Serial.println(WiFi.SSID());
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
  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN);
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

  String payload = "{\"rfid\":\"" + rfidTag + "\",\"timestamp\":\"" +
                   timestamp + "\",\"device\":\"" + deviceID + "\"}";
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
