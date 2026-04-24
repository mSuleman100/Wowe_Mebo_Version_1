/*
 * ESP32 MEBO Robot Bridge (WebSocket Push)
 *
 * Author: M. Suleman Anwar
 *
 * Architecture:
 *   Server → persistent WebSocket → ESP32 → Serial → Arduino Nano → MEBO motors
 *
 * Why WebSocket instead of HTTP polling:
 *   - Previous HTTP polling opened a new TCP connection every 30ms (~20-50ms overhead each).
 *   - WebSocket keeps one persistent connection open — commands arrive in <5ms.
 *   - No polling interval means zero queuing delay.
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsClient.h>

#define RXD2 26
#define TXD2 25

HardwareSerial &nanoSerial = Serial1;

const char *ssid     = "FRT-Labs";
const char *password = "Labs_#$%345";
const char *WS_HOST  = "192.168.0.101";
const int   WS_PORT  = 8002;
const char *device_id = "bravo";

WebSocketsClient webSocket;
volatile bool ws_connected = false;

void onWsEvent(WStype_t type, uint8_t *payload, size_t length)
{
  switch (type)
  {
  case WStype_CONNECTED:
    ws_connected = true;
    Serial.printf("[WS] Connected → ws://%s:%d/mebo/ws/%s\n", WS_HOST, WS_PORT, device_id);
    break;

  case WStype_DISCONNECTED:
    ws_connected = false;
    Serial.println("[WS] Disconnected — reconnecting...");
    break;

  case WStype_TEXT:
  {
    // Message format: "CMD:{msg_id}:{arduino_cmd}"
    String msg = String((char *)payload);
    if (msg.startsWith("CMD:"))
    {
      int sep = msg.lastIndexOf(':');
      if (sep > 4 && sep < (int)msg.length() - 1)
      {
        String msg_id  = msg.substring(4, sep);
        char   cmd     = msg.charAt(sep + 1);

        Serial.printf("[WS] Command: '%c'\n", cmd);
        nanoSerial.write(cmd);

        // ACK back to server
        webSocket.sendTXT("ACK:" + msg_id);
      }
    }
    break;
  }

  case WStype_ERROR:
    Serial.println("[WS] Error");
    break;

  default:
    break;
  }
}

void setup()
{
  Serial.begin(115200);
  nanoSerial.begin(115200, SERIAL_8N1, RXD2, TXD2);

  Serial.println("\n[BOOT] ESP32 MEBO WebSocket Bridge");

  WiFi.begin(ssid, password);
  WiFi.setSleep(false);
  Serial.print("[WIFI] Connecting");

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(300);
    Serial.print(".");
    if (++attempts > 40)
    {
      Serial.println("\n[WIFI] Timeout — restarting");
      ESP.restart();
    }
  }
  Serial.printf("\n[WIFI] Connected — IP: %s  RSSI: %d dBm\n",
                WiFi.localIP().toString().c_str(), WiFi.RSSI());

  String path = String("/mebo/ws/") + device_id;
  webSocket.begin(WS_HOST, WS_PORT, path);
  webSocket.onEvent(onWsEvent);
  webSocket.setReconnectInterval(2000);
  webSocket.enableHeartbeat(15000, 3000, 2); // ping every 15s, pong timeout 3s

  Serial.printf("[WS] Connecting → ws://%s:%d%s\n", WS_HOST, WS_PORT, path.c_str());
}

void loop()
{
  if (WiFi.status() != WL_CONNECTED)
  {
    WiFi.reconnect();
    delay(1000);
    return;
  }

  webSocket.loop();
}
