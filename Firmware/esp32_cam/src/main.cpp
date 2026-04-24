/*
 * ESP32-CAM WebSocket Stream (Stable Single-Loop)
 *
 * Author: M. Suleman Anwar
 *
 * Architecture:
 *   ESP32-CAM → persistent WebSocket → FastAPI /video/{feed_id}/ws
 *
 * Why single-loop (not FreeRTOS tasks):
 *   - webSocket.loop() MUST run frequently to keep the WS protocol alive.
 *   - With FreeRTOS tasks, sendBIN() blocked the loop() call for seconds,
 *     causing the heartbeat pong to time out and kill the connection every
 *     1-2 frames. Single loop guarantees loop() runs before every send.
 */

#include "esp_camera.h"
#include <WiFi.h>
#include <WebSocketsClient.h>

// ============================================================================
// Configuration
// ============================================================================

const char *SSID = "FRT-Labs";
const char *PASSWORD = "Labs_#$%345";
const char *WS_HOST = "192.168.0.101";
const int WS_PORT = 8002;
const char *FEED_ID = "alpha";

#define TARGET_FPS 15
#define FRAME_INTERVAL (1000 / TARGET_FPS) // ms

// AI Thinker ESP32-CAM pin map
#define PWDN_GPIO_NUM 32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM 0
#define SIOD_GPIO_NUM 26
#define SIOC_GPIO_NUM 27
#define Y9_GPIO_NUM 35
#define Y8_GPIO_NUM 34
#define Y7_GPIO_NUM 39
#define Y6_GPIO_NUM 36
#define Y5_GPIO_NUM 21
#define Y4_GPIO_NUM 19
#define Y3_GPIO_NUM 18
#define Y2_GPIO_NUM 5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM 23
#define PCLK_GPIO_NUM 22

// ============================================================================
// Globals
// ============================================================================

WebSocketsClient webSocket;
volatile bool ws_connected = false;
unsigned long last_frame_ms = 0;

// ============================================================================
// WebSocket event handler
// ============================================================================

void onWsEvent(WStype_t type, uint8_t *payload, size_t length)
{
  switch (type)
  {
  case WStype_CONNECTED:
    ws_connected = true;
    Serial.printf("[WS] Connected → ws://%s:%d/video/%s/ws\n",
                  WS_HOST, WS_PORT, FEED_ID);
    break;
  case WStype_DISCONNECTED:
    ws_connected = false;
    Serial.println("[WS] Disconnected — reconnecting...");
    break;
  case WStype_ERROR:
    Serial.println("[WS] Error");
    break;
  default:
    break;
  }
}

// ============================================================================
// Camera init
// ============================================================================

bool initCamera()
{
  camera_config_t cfg = {};
  cfg.ledc_channel = LEDC_CHANNEL_0;
  cfg.ledc_timer = LEDC_TIMER_0;
  cfg.pin_d0 = Y2_GPIO_NUM;
  cfg.pin_d1 = Y3_GPIO_NUM;
  cfg.pin_d2 = Y4_GPIO_NUM;
  cfg.pin_d3 = Y5_GPIO_NUM;
  cfg.pin_d4 = Y6_GPIO_NUM;
  cfg.pin_d5 = Y7_GPIO_NUM;
  cfg.pin_d6 = Y8_GPIO_NUM;
  cfg.pin_d7 = Y9_GPIO_NUM;
  cfg.pin_xclk = XCLK_GPIO_NUM;
  cfg.pin_sscb_sda = SIOD_GPIO_NUM;
  cfg.pin_sscb_scl = SIOC_GPIO_NUM;
  cfg.pin_pwdn = PWDN_GPIO_NUM;
  cfg.pin_reset = RESET_GPIO_NUM;
  cfg.pin_pclk = PCLK_GPIO_NUM;
  cfg.pin_vsync = VSYNC_GPIO_NUM;
  cfg.pin_href = HREF_GPIO_NUM;
  cfg.xclk_freq_hz = 20000000;
  cfg.pixel_format = PIXFORMAT_JPEG;
  cfg.frame_size = FRAMESIZE_QVGA; // 320×240 — fast capture, small frames
  cfg.jpeg_quality = 25;           // 0-63, lower = better quality
  cfg.fb_count = 2;
  cfg.fb_location = CAMERA_FB_IN_PSRAM;

  esp_err_t err = esp_camera_init(&cfg);
  if (err != ESP_OK)
  {
    Serial.printf("[CAM] Init failed: 0x%x\n", err);
    return false;
  }

  sensor_t *s = esp_camera_sensor_get();
  if (s)
  {
    s->set_framesize(s, FRAMESIZE_QVGA);
    s->set_quality(s, 25);
    s->set_brightness(s, 1);
    s->set_saturation(s, 0);
    s->set_gainceiling(s, (gainceiling_t)2);
    s->set_whitebal(s, 1); // auto white balance on
    s->set_awb_gain(s, 1);
    s->set_exposure_ctrl(s, 1); // auto exposure on
  }

  Serial.println("[CAM] Initialised OK");
  return true;
}

// ============================================================================
// Setup
// ============================================================================

void setup()
{
  Serial.begin(115200);
  Serial.println("\n[BOOT] ESP32-CAM WebSocket Stream");

  if (!initCamera())
  {
    Serial.println("[ERR] Camera init failed — halting");
    while (true)
      delay(1000);
  }

  WiFi.begin(SSID, PASSWORD);
  WiFi.setSleep(false); // Disable power-save — removes ~20ms jitter per packet
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

  String path = String("/video/") + FEED_ID + "/ws";
  webSocket.begin(WS_HOST, WS_PORT, path);
  webSocket.onEvent(onWsEvent);
  webSocket.setReconnectInterval(2000);
  // NOTE: No enableHeartbeat() — heartbeat pong timeout was killing the
  // connection whenever sendBIN() took more than 3s on a congested hotspot.
  // setReconnectInterval handles actual network drops without false kills.

  Serial.printf("[WS] Connecting → ws://%s:%d%s\n", WS_HOST, WS_PORT, path.c_str());
}

// ============================================================================
// Main loop — single-loop design
//
// webSocket.loop() is called at the TOP of every iteration, before anything
// else. This guarantees the WS protocol (ACKs, reconnect, event dispatch)
// stays responsive regardless of how long sendBIN() took last time.
// ============================================================================

void loop()
{
  // Always service the WebSocket state machine first
  webSocket.loop();

  if (!ws_connected)
  {
    delay(10);
    return;
  }

  // Rate-limit to TARGET_FPS
  unsigned long now = millis();
  if (now - last_frame_ms < FRAME_INTERVAL)
    return;

  // Capture frame
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb)
  {
    Serial.println("[CAM] Capture failed");
    return;
  }

  // Send over WebSocket — binary frame
  bool ok = webSocket.sendBIN(fb->buf, fb->len);
  esp_camera_fb_return(fb); // return DMA buffer immediately

  if (ok)
  {
    last_frame_ms = millis();
  }
  else
  {
    Serial.println("[WS] sendBIN failed");
  }
}
