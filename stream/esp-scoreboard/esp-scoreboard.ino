// MadGear score buttons: ESP32 / ESP8266 with a 128x64 OLED.
// Talks to the overlay server (stream/server.mjs) over Wi-Fi and shows the live score.
//
// Buttons (wired from the pin to GND, no resistors needed):
//   P1 button   short press = P1 +1    hold (0.6 s) = P1 -1
//   P2 button   short press = P2 +1    hold (0.6 s) = P2 -1
//   both        hold 2 s = reset score
//
// Arduino IDE libraries (Library Manager): "U8g2" by olikraus, "ArduinoJson" by Benoit Blanchon.

// ===================== Settings =====================
const char* WIFI_SSID = "your-wifi";
const char* WIFI_PASS = "your-password";
const char* SERVER = "http://192.168.1.50:8123";  // stream PC IP (ipconfig), port from config.json

const int BTN_P1 = 13;  // ESP32: avoid 34-39 (no pull-up). ESP8266: use D5/D6/D7 (14/12/13)
const int BTN_P2 = 14;

// OLED: pick the line that matches your display. I2C pins: -1 = board default.
#define OLED_SDA -1   // Heltec WiFi Kit 32 (V2): 4    generic ESP32: 21
#define OLED_SCL -1   // Heltec WiFi Kit 32 (V2): 15   generic ESP32: 22
#define OLED_RST -1   // Heltec WiFi Kit 32 (V2): 16
// ====================================================

#include <U8g2lib.h>
#include <ArduinoJson.h>
#if defined(ESP32)
  #include <WiFi.h>
  #include <HTTPClient.h>
#else
  #include <ESP8266WiFi.h>
  #include <ESP8266HTTPClient.h>
#endif

#define PIN(p) ((p) == -1 ? U8X8_PIN_NONE : (p))
U8G2_SSD1306_128X64_NONAME_F_HW_I2C oled(U8G2_R0, PIN(OLED_RST), PIN(OLED_SCL), PIN(OLED_SDA));
// U8G2_SH1106_128X64_NONAME_F_HW_I2C oled(U8G2_R0, PIN(OLED_RST), PIN(OLED_SCL), PIN(OLED_SDA));  // 1.3" OLEDs

struct State { String p1 = "P1", p2 = "P2", title; int s1 = 0, s2 = 0, ft = 10; bool online = false; } st;

bool request(const String& path) {
  if (WiFi.status() != WL_CONNECTED) { st.online = false; return false; }
  WiFiClient client;
  HTTPClient http;
  http.setTimeout(700);
  http.begin(client, String(SERVER) + path);
  int code = http.GET();
  bool ok = false;
  if (code == 200) {
    JsonDocument doc;
    if (!deserializeJson(doc, http.getString())) {
      st.p1 = doc["p1"] | "P1"; st.p2 = doc["p2"] | "P2"; st.title = doc["title"] | "";
      st.s1 = doc["s1"] | 0;    st.s2 = doc["s2"] | 0;    st.ft = doc["ft"] | 10;
      ok = true;
    }
  }
  http.end();
  st.online = ok;
  return ok;
}

void draw() {
  oled.clearBuffer();
  // Top line: title + FT
  oled.setFont(u8g2_font_6x10_tf);
  String top = st.title + "  FT" + st.ft;
  top.toUpperCase();
  oled.drawStr(0, 9, top.c_str());
  if (!st.online) {
    oled.setDrawColor(0); oled.drawBox(128 - 6 * 7 - 2, 0, 6 * 7 + 2, 11); oled.setDrawColor(1);
    oled.drawStr(128 - 6 * 7, 9, WiFi.status() == WL_CONNECTED ? "server?" : "wifi...");
  }

  // Scores, winner boxed
  oled.setFont(u8g2_font_logisoso32_tn);
  char a[4], b[4];
  snprintf(a, sizeof a, "%d", st.s1);
  snprintf(b, sizeof b, "%d", st.s2);
  int wa = oled.getStrWidth(a), wb = oled.getStrWidth(b);
  oled.drawStr(32 - wa / 2, 49, a);
  oled.drawStr(96 - wb / 2, 49, b);
  oled.drawBox(61, 31, 6, 3);  // dash
  if (st.s1 >= st.ft) oled.drawFrame(32 - wa / 2 - 4, 13, wa + 8, 40);
  if (st.s2 >= st.ft) oled.drawFrame(96 - wb / 2 - 4, 13, wb + 8, 40);

  // Names
  oled.setFont(u8g2_font_5x8_tf);
  String n1 = st.p1.substring(0, 12), n2 = st.p2.substring(0, 12);
  oled.drawStr(0, 63, n1.c_str());
  oled.drawStr(128 - oled.getStrWidth(n2.c_str()), 63, n2.c_str());
  oled.sendBuffer();
}

// Button handling: short press fires on release, hold fires once at 600 ms.
struct Button { int pin; bool down = false; unsigned long since = 0; bool fired = false; };
Button b1{BTN_P1}, b2{BTN_P2};
bool comboUsed = false;
const unsigned long HOLD_MS = 600, RESET_MS = 2000, DEBOUNCE_MS = 30;

void handle(Button& b, const char* plus, const char* minus, unsigned long now) {
  bool pressed = digitalRead(b.pin) == LOW;
  if (pressed && !b.down && now - b.since > DEBOUNCE_MS) { b.down = true; b.since = now; b.fired = false; }
  else if (!pressed && b.down && now - b.since > DEBOUNCE_MS) {
    b.down = false; b.since = now;
    if (!b.fired && !comboUsed) { request(plus); draw(); }
  }
  if (b.down && !b.fired && !comboUsed && now - b.since >= HOLD_MS && !(b1.down && b2.down)) {
    b.fired = true; request(minus); draw();
  }
}

void setup() {
  pinMode(BTN_P1, INPUT_PULLUP);
  pinMode(BTN_P2, INPUT_PULLUP);
  oled.begin();
  draw();
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
}

unsigned long lastPoll = 0;

void loop() {
  unsigned long now = millis();
  handle(b1, "/api/p1/plus", "/api/p1/minus", now);
  handle(b2, "/api/p2/plus", "/api/p2/minus", now);

  // Both held: reset after 2 s. Ignore the individual presses until both are released.
  if (b1.down && b2.down) {
    if (!comboUsed && now - max(b1.since, b2.since) >= RESET_MS) { comboUsed = true; request("/api/reset"); draw(); }
    if (now - max(b1.since, b2.since) > 150) b1.fired = b2.fired = true;
  }
  if (!b1.down && !b2.down) comboUsed = false;

  // Keep in sync with changes from the control panel / streamdeck
  if (now - lastPoll > 1000) { lastPoll = now; request("/api/state"); draw(); }
  delay(5);
}
