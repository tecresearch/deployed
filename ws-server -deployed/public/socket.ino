#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// WebSocket server details
const char* websocket_server = "YOUR_COMPUTER_IP";  // Change this to your computer's IP
const uint16_t websocket_port = 8080;              // Match the port in your HTML file

WebSocketsClient webSocket;

// Sensor simulation variables
unsigned long lastDataSend = 0;
const long dataInterval = 5000;  // Send data every 5 seconds

void setup() {
  Serial.begin(115200);
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected with IP: ");
  Serial.println(WiFi.localIP());

  // Configure WebSocket connection
  webSocket.begin(websocket_server, websocket_port, "/");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

void loop() {
  webSocket.loop();
  
  // Send sensor data at regular intervals
  if (millis() - lastDataSend > dataInterval) {
    lastDataSend = millis();
    sendSensorData();
  }
}

void sendSensorData() {
  // Create a JSON document
  DynamicJsonDocument doc(256);
  
  // Generate random sensor ID (1-100)
  int sensorId = random(1, 101);
  doc["sensorId"] = "ESP32_" + String(sensorId);
  
  // Generate realistic sensor values based on type
  int sensorType = sensorId % 4;  // 0-3 for different sensor types
  
  switch(sensorType) {
    case 0:  // Temperature
      doc["temperature"] = random(150, 351) / 10.0;  // 15.0-35.0°C
      break;
    case 1:  // Humidity
      doc["humidity"] = random(300, 860) / 10.0;     // 30.0-85.0%
      break;
    case 2:  // Soil moisture
      doc["soilMoisture"] = random(100, 901) / 10.0; // 10.0-90.0%
      break;
    case 3:  // Light level
      doc["lightLevel"] = random(100, 1001);         // 100-1000 lux
      break;
  }
  
  // Serialize JSON to string
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Send via WebSocket
  webSocket.sendTXT(jsonString);
  Serial.println("Sent: " + jsonString);
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[WSc] Disconnected!");
      break;
    case WStype_CONNECTED:
      Serial.println("[WSc] Connected to server");
      // Send welcome message if needed
      // webSocket.sendTXT("Connected");
      break;
    case WStype_TEXT:
      Serial.printf("[WSc] Received text: %s\n", payload);
      // Handle incoming messages if needed
      break;
    case WStype_ERROR:
    case WStype_FRAGMENT_TEXT_START:
    case WStype_FRAGMENT_BIN_START:
    case WStype_FRAGMENT:
    case WStype_FRAGMENT_FIN:
      // Handle other events if needed
      break;
  }
}