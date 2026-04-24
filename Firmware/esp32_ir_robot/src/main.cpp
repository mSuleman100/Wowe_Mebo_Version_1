/*
 ==============================================================================
  WOWE ESP32-IR Command Client (WiFi Polling + HTTP ACK)

  Purpose:
  - Poll backend for IR commands (in "$XX" format)
  - Execute IR
  - POST ACK back so backend /cmd can unblock (Option A)

  Backend Contract:
  - GET  http://<SERVER_IP>:8002/ir/next/<device_id>
	  - 204: no command
	  - 200: body like "$8E\n"
	  - headers include: x-wowe-msg-id
  - POST http://<SERVER_IP>:8002/ir/ack/<device_id>/<message_id>
	  - 204 on success
 ==============================================================================
*/

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>

// =============================
// Configuration
// =============================
#define FIRMWARE_VERSION "0.0.3"

const char *ssid = "suleman";
const char *password = "12345678";

// IMPORTANT: Use your PC/host IP on the hotspot LAN.
const char *server_origin = "http://192.168.137.1:8002";

// Device ID should match backend endpoint: /ir/next/{device_id}
const char *device_id = "alpha";

// Poll interval (ms)
const uint32_t poll_interval_ms = 120;
uint32_t last_poll_ms = 0;

// =============================
// IR / Carrier Configuration
// =============================
#define TX_PIN 25
#define T 833
#define CARRIER_FREQ 39200 // Hz
#define CARRIER_DUTY 128   // 50% of 8-bit PWM

void carrierOn(void);
void carrierOff(void);
void sendBit(bool bitVal);
void sendCode(uint8_t data);

int hexDigitVal(char c);
bool tryParseDollarHex(const String &s, uint8_t *out_cmd);

void handleCommand(uint8_t cmd);

// Optional: keep your serial parser for manual testing
String serial_buffer = "";
void serial_data_checking(void);

// We need this header to ACK the correct message
const char *headerKeys[] = {"x-wowe-msg-id"};
const size_t headerKeysCount = 1;

// =============================
// Setup
// =============================
void setup()
{
	Serial.begin(115200);
	delay(50);

	Serial.printf("Firmware Version: %s\r\n", FIRMWARE_VERSION);

	pinMode(TX_PIN, OUTPUT);
	ledcAttachPin(TX_PIN, 0);
	ledcSetup(0, CARRIER_FREQ, 8); // channel 0, 8-bit
	carrierOff();

	Serial.println("IR carrier transmitter ready");

	WiFi.mode(WIFI_STA);
	WiFi.begin(ssid, password);

	Serial.print("Connecting to WiFi: ");
	Serial.println(ssid);

	uint32_t started = millis();
	while (WiFi.status() != WL_CONNECTED && millis() - started < 20000)
	{
		delay(300);
		Serial.print(".");
	}

	Serial.println();
	if (WiFi.status() != WL_CONNECTED)
	{
		Serial.println("WiFi connection failed (timeout).");
	}
	else
	{
		Serial.print("WiFi connected. IP: ");
		Serial.println(WiFi.localIP());
	}

	Serial.print("Polling endpoint: ");
	Serial.print(server_origin);
	Serial.print("/ir/next/");
	Serial.println(device_id);
}

// =============================
// Main Loop
// =============================
void loop()
{
	// Allow manual serial testing with "$8E"
	serial_data_checking();

	// WiFi reconnect if needed
	if (WiFi.status() != WL_CONNECTED)
	{
		static uint32_t last_reconnect_ms = 0;
		if (millis() - last_reconnect_ms > 2000)
		{
			last_reconnect_ms = millis();
			Serial.println("WiFi disconnected. Reconnecting...");
			WiFi.disconnect();
			WiFi.begin(ssid, password);
		}
		delay(10);
		return;
	}

	// Polling loop
	if (millis() - last_poll_ms < poll_interval_ms)
	{
		delay(2);
		return;
	}
	last_poll_ms = millis();

	HTTPClient http;
	String url = String(server_origin) + "/ir/next/" + String(device_id);

	http.begin(url);
	http.setTimeout(1200);

	// IMPORTANT: collect headers before GET()
	http.collectHeaders(headerKeys, headerKeysCount);

	int code = http.GET();
	if (code == 204)
	{
		http.end();
		return;
	}

	if (code != 200)
	{
		Serial.printf("IR poll failed. HTTP=%d URL=%s\r\n", code, url.c_str());
		http.end();
		return;
	}

	// Read msg id header BEFORE http.end()
	String msg_id = http.header("x-wowe-msg-id");

	String body = http.getString();
	http.end();

	body.trim();
	if (body.length() == 0)
		return;

	uint8_t cmd = 0;
	if (!tryParseDollarHex(body, &cmd))
	{
		Serial.printf("Bad IR payload: '%s'\r\n", body.c_str());
		return;
	}

	Serial.print("RX (http): ");
	Serial.print(body);
	Serial.print(" msg_id=");
	Serial.println(msg_id);

	// Execute IR
	handleCommand(cmd);

	// POST ACK back so backend /cmd can unblock
	if (msg_id.length() > 0)
	{
		HTTPClient ack;
		String ack_url = String(server_origin) + "/ir/ack/" + String(device_id) + "/" + msg_id;
		ack.begin(ack_url);
		ack.setTimeout(1200);
		int ack_code = ack.POST(""); // 204 expected
		ack.end();

		Serial.printf("ACK_HTTP=%d msg_id=%s\r\n", ack_code, msg_id.c_str());
	}
	else
	{
		Serial.println("ACK_HTTP=SKIP (missing x-wowe-msg-id)");
	}

	// Optional: keep your serial-only ACK (debug)
	Serial.println("ACK");
}

// =============================
// IR Carrier Helpers
// =============================
void carrierOn(void) { ledcWrite(0, CARRIER_DUTY); }
void carrierOff(void) { ledcWrite(0, 0); }

void sendBit(bool bitVal)
{
	carrierOff();
	delayMicroseconds(bitVal ? 4 * T : T);

	carrierOn();
	delayMicroseconds(T);
	carrierOff();
}

void sendCode(uint8_t data)
{
	// Start pulse = carrier ON for 8T
	carrierOn();
	delayMicroseconds(8 * T);
	carrierOff();

	// Bits MSB first
	for (int i = 7; i >= 0; i--)
		sendBit((data >> i) & 0x01);

	carrierOff();
}

// =============================
// Parsing
// =============================
int hexDigitVal(char c)
{
	if (c >= '0' && c <= '9')
		return c - '0';
	if (c >= 'A' && c <= 'F')
		return 10 + (c - 'A');
	if (c >= 'a' && c <= 'f')
		return 10 + (c - 'a');
	return -1;
}

bool tryParseDollarHex(const String &s, uint8_t *out_cmd)
{
	if (!out_cmd)
		return false;
	if (s.length() < 3)
		return false;
	if (s.charAt(0) != '$')
		return false;

	int v1 = hexDigitVal(s.charAt(1));
	int v2 = hexDigitVal(s.charAt(2));
	if (v1 < 0 || v2 < 0)
		return false;

	*out_cmd = (uint8_t)((v1 << 4) | v2);
	return true;
}

// =============================
// Serial "$XX" (optional)
// =============================
void serial_data_checking(void)
{
	while (Serial.available())
	{
		char c = (char)Serial.read();

		if (c == '\n' || c == '\r')
		{
			serial_buffer.trim();
			if (serial_buffer.length() > 0)
			{
				uint8_t cmd = 0;
				if (tryParseDollarHex(serial_buffer, &cmd))
				{
					Serial.print("RX (serial): ");
					Serial.println(serial_buffer);
					handleCommand(cmd);
					Serial.println("ACK");
				}
				else
				{
					Serial.println("NACK: expected $XX");
				}
			}
			serial_buffer = "";
			continue;
		}

		serial_buffer += c;
		if (serial_buffer.length() > 16)
			serial_buffer = "";
	}
}

// =============================
// Command Execution
// =============================
void handleCommand(uint8_t cmd)
{
	if (cmd >= 0x80 && cmd <= 0xFE)
	{
		Serial.print("Executing command 0x");
		if (cmd < 16)
			Serial.print('0');
		Serial.println(cmd, HEX);

		// Send twice like your original code
		for (uint8_t i = 0; i < 2; i++)
		{
			sendCode(cmd);
			delay(100);
		}
		return;
	}

	Serial.printf("Unknown command: 0x%02X\r\n", cmd);
}