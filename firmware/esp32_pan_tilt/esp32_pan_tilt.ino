#include <WiFi.h>
#include <WebServer.h>
#include <ESP32Servo.h>

// ============================================================================
// FloodScout — Dual Control Pan & Tilt Action Sonar / SG90 Controller
//
// Supports:
// 1. Physical Buttons
// 2. Wi-Fi Website Commands
//
// Website → Wi-Fi → ESP32 → SG90
// Physical Buttons → ESP32 → SG90
// ============================================================================

// ============================================================================
// Wi-Fi Settings
// ============================================================================

const char* WIFI_SSID = "vivo V30";
const char* WIFI_PASSWORD = "halogoodgood";

WebServer server(80);

// ============================================================================
// Servo Pins
// ============================================================================

#define SERVO_PAN_PIN   18
#define SERVO_TILT_PIN  19

// ============================================================================
// Physical Button Pins
// ============================================================================

#define BTN_LEFT        25
#define BTN_RIGHT       26
#define BTN_UP          27
#define BTN_DOWN        14

Servo panServo;
Servo tiltServo;

// ============================================================================
// 360° Servo Settings
// ============================================================================

// 1500 = STOP
const int STOP_US = 1500;

// Adjust these values according to your actual servo direction/speed
const int SPEED_SLOW_CW  = 1380;
const int SPEED_SLOW_CCW = 1620;

// Website single-click movement duration
const unsigned long STEP_DURATION_MS = 200;

// ============================================================================
// Movement timers
// ============================================================================

unsigned long panStopAt = 0;
unsigned long tiltStopAt = 0;

int panTargetSpeed = STOP_US;
int tiltTargetSpeed = STOP_US;

// ============================================================================
// Wi-Fi Command Handler
// ============================================================================

void executeCommand(String cmd) {

  cmd.trim();
  cmd.toUpperCase();

  unsigned long now = millis();

  if (cmd == "LEFT") {

    panTargetSpeed = SPEED_SLOW_CW;
    panStopAt = now + STEP_DURATION_MS;

    Serial.println("WiFi Command: LEFT");

  }

  else if (cmd == "RIGHT") {

    panTargetSpeed = SPEED_SLOW_CCW;
    panStopAt = now + STEP_DURATION_MS;

    Serial.println("WiFi Command: RIGHT");

  }

  else if (cmd == "UP") {

    tiltTargetSpeed = SPEED_SLOW_CW;
    tiltStopAt = now + STEP_DURATION_MS;

    Serial.println("WiFi Command: UP");

  }

  else if (cmd == "DOWN") {

    tiltTargetSpeed = SPEED_SLOW_CCW;
    tiltStopAt = now + STEP_DURATION_MS;

    Serial.println("WiFi Command: DOWN");

  }

  else if (cmd == "STOP") {

    panTargetSpeed = STOP_US;
    tiltTargetSpeed = STOP_US;

    panStopAt = 0;
    tiltStopAt = 0;

    panServo.writeMicroseconds(STOP_US);
    tiltServo.writeMicroseconds(STOP_US);

    Serial.println("WiFi Command: STOP");

  }

  else if (cmd == "CENTER") {

    // IMPORTANT:
    // Your current hardware uses 360° continuous servos.
    // CENTER cannot physically move to an angle like a normal 180° servo.
    // Therefore CENTER currently means STOP BOTH SERVOS.

    panTargetSpeed = STOP_US;
    tiltTargetSpeed = STOP_US;

    panStopAt = 0;
    tiltStopAt = 0;

    panServo.writeMicroseconds(STOP_US);
    tiltServo.writeMicroseconds(STOP_US);

    Serial.println("WiFi Command: CENTER");

  }

  else {

    Serial.println("WiFi Command: UNKNOWN");

  }
}

// ============================================================================
// HTTP Response
// ============================================================================

void sendResponse(String command) {


  String json = "{";
  json += "\"success\":true,";
  json += "\"command\":\"" + command + "\",";
  json += "\"ip\":\"" + WiFi.localIP().toString() + "\"";
  json += "}";

  server.send(200, "application/json", json);
}

// ============================================================================
// API Endpoints
// ============================================================================

void handleLeft() {

  executeCommand("LEFT");
  sendResponse("LEFT");

}

void handleRight() {

  executeCommand("RIGHT");
  sendResponse("RIGHT");

}

void handleUp() {

  executeCommand("UP");
  sendResponse("UP");

}

void handleDown() {

  executeCommand("DOWN");
  sendResponse("DOWN");

}

void handleStop() {

  executeCommand("STOP");
  sendResponse("STOP");

}

void handleCenter() {

  executeCommand("CENTER");
  sendResponse("CENTER");

}

// ============================================================================
// Status Endpoint
// ============================================================================

void handleStatus() {

  String json = "{";
  json += "\"success\":true,";
  json += "\"device\":\"FloodScout Pan/Tilt\",";
  json += "\"wifi\":true,";
  json += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
  json += "\"rssi\":" + String(WiFi.RSSI());
  json += "}";

  server.send(200, "application/json", json);

}

// ============================================================================
// CORS
// ============================================================================

void handleOptions() {

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");

  server.send(204);

}

// ============================================================================
// Setup
// ============================================================================

void setup() {

  Serial.begin(115200);

  // --------------------------------------------------------------------------
  // Physical Buttons
  // --------------------------------------------------------------------------

  pinMode(BTN_LEFT, INPUT_PULLUP);
  pinMode(BTN_RIGHT, INPUT_PULLUP);
  pinMode(BTN_UP, INPUT_PULLUP);
  pinMode(BTN_DOWN, INPUT_PULLUP);

  // --------------------------------------------------------------------------
  // Servo PWM
  // --------------------------------------------------------------------------

  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);

  panServo.setPeriodHertz(50);
  tiltServo.setPeriodHertz(50);

  panServo.attach(SERVO_PAN_PIN, 500, 2500);
  tiltServo.attach(SERVO_TILT_PIN, 500, 2500);

  // Start with both servos stopped

  panServo.writeMicroseconds(STOP_US);
  tiltServo.writeMicroseconds(STOP_US);

  // --------------------------------------------------------------------------
  // Connect to Wi-Fi
  // --------------------------------------------------------------------------

  Serial.println();
  Serial.println("=================================");
  Serial.println("FloodScout Starting...");
  Serial.println("=================================");

  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {

    delay(500);
    Serial.print(".");

  }

  Serial.println();
  Serial.println("Wi-Fi Connected!");

  Serial.print("ESP32 IP Address: ");
  Serial.println(WiFi.localIP());

  Serial.print("Signal Strength: ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");

  // --------------------------------------------------------------------------
  // Web Server Routes
  // --------------------------------------------------------------------------


  server.on("/api/pan-tilt/left", HTTP_GET, handleLeft);
  server.on("/api/pan-tilt/right", HTTP_GET, handleRight);
  server.on("/api/pan-tilt/up", HTTP_GET, handleUp);
  server.on("/api/pan-tilt/down", HTTP_GET, handleDown);
  server.on("/api/pan-tilt/stop", HTTP_GET, handleStop);
  server.on("/api/pan-tilt/center", HTTP_GET, handleCenter);

  server.on("/api/pan-tilt/status", HTTP_GET, handleStatus);

  server.on("/api/pan-tilt/left", HTTP_OPTIONS, handleOptions);
  server.on("/api/pan-tilt/right", HTTP_OPTIONS, handleOptions);
  server.on("/api/pan-tilt/up", HTTP_OPTIONS, handleOptions);
  server.on("/api/pan-tilt/down", HTTP_OPTIONS, handleOptions);
  server.on("/api/pan-tilt/stop", HTTP_OPTIONS, handleOptions);
  server.on("/api/pan-tilt/center", HTTP_OPTIONS, handleOptions);
  server.on("/api/pan-tilt/status", HTTP_OPTIONS, handleOptions);

  // --------------------------------------------------------------------------
  // Start Web Server
  // --------------------------------------------------------------------------

  server.begin();

  Serial.println("Web Server Started!");
  Serial.println();
  Serial.println("Available commands:");
  Serial.println("LEFT");
  Serial.println("RIGHT");
  Serial.println("UP");
  Serial.println("DOWN");
  Serial.println("STOP");
  Serial.println("CENTER");
  Serial.println();
}

// ============================================================================
// Main Loop
// ============================================================================

void loop() {

  // Handle Website Wi-Fi requests
  server.handleClient();

  unsigned long now = millis();

  // ========================================================================
  // Read Physical Buttons
  // ========================================================================

  bool leftPressed =
    (digitalRead(BTN_LEFT) == LOW);

  bool rightPressed =
    (digitalRead(BTN_RIGHT) == LOW);

  bool upPressed =
    (digitalRead(BTN_UP) == LOW);

  bool downPressed =
    (digitalRead(BTN_DOWN) == LOW);

  // ========================================================================
  // PAN — Physical Buttons have priority
  // ========================================================================

  if (leftPressed && !rightPressed) {

    panServo.writeMicroseconds(SPEED_SLOW_CW);

    panStopAt = 0;

  }

  else if (rightPressed && !leftPressed) {

    panServo.writeMicroseconds(SPEED_SLOW_CCW);

    panStopAt = 0;

  }

  else if (now < panStopAt) {

    panServo.writeMicroseconds(panTargetSpeed);

  }

  else {

    panServo.writeMicroseconds(STOP_US);

  }

  // ========================================================================
  // TILT — Physical Buttons have priority
  // ========================================================================

  if (upPressed && !downPressed) {

    tiltServo.writeMicroseconds(SPEED_SLOW_CW);

    tiltStopAt = 0;

  }

  else if (downPressed && !upPressed) {

    tiltServo.writeMicroseconds(SPEED_SLOW_CCW);

    tiltStopAt = 0;

  }

  else if (now < tiltStopAt) {

    tiltServo.writeMicroseconds(tiltTargetSpeed);

  }

  else {

    tiltServo.writeMicroseconds(STOP_US);

  }

  delay(10);
}
