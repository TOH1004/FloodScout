#include <WiFi.h>
#include <WebServer.h>
#include <ESP32Servo.h>
#include <TinyGPSPlus.h>

// ============================================================================
// FloodScout — Comprehensive Multi-Controller
// 1. Pan & Tilt Arm (Pins 18 & 19) — SG90 / MG90S Positional Servos
// 2. Ultrasonic Obstacle Sensor (TRIG 5, ECHO 4) — Ringing/Glitch Filtered
// 3. NEO-8M Hardware GPS (UART2: RXD2 12, TXD2 13) — TinyGPSPlus NMEA
// 4. Physical Push Buttons (Pins 25, 26, 27, 14) — Debounced & Non-blocking
// 5. Dual ESC Thruster Motors (Left Pin 21, Right Pin 16) — 50Hz Hardware PWM
// 6. RC Receiver Inputs (CH1 Steering: Pin 34, CH2 Throttle: Pin 35)
// ============================================================================

// --- Wi-Fi Credentials ---
const char* WIFI_SSID     = "vivo V30";
const char* WIFI_PASSWORD = "halogoodgood";

WebServer server(80);

// ============================================================================
// 1. DUAL ESC THRUSTER MOTOR CONFIGURATION
// ============================================================================
const int PIN_RC_CH1   = 34;    // Receiver CH1 (Steering)
const int PIN_RC_CH2   = 35;    // Receiver CH2 (Throttle)
const int PIN_ESC_LEFT  = 21;   // Left ESC signal
const int PIN_ESC_RIGHT = 16;   // Right ESC signal

const int PWM_FREQ = 50;        // 50Hz standard servo/ESC refresh rate (20ms)
const int PWM_RES  = 16;        // 16-bit resolution (0 - 65535)
const int ESC_STOP = 1500;

int rc_mid_ch1 = 1500;
int rc_mid_ch2 = 1384;          // Custom throttle center reference

int currentLeftUs  = ESC_STOP;
int currentRightUs = ESC_STOP;
int rawCh1 = 1500;
int rawCh2 = 1500;
bool rcSignalActive = false;
String motionState = "STOP";
unsigned long lastRcReadTime = 0;
unsigned long lastPrintTime = 0;
unsigned long lastFailsafePrintTime = 0;
unsigned long webOverrideUntil = 0; // For web manual driving commands

// Convert pulse width in microseconds to PWM duty cycle: (us / 20000.0) * 65535
uint32_t usToDuty(int us) {
  return (uint32_t)((us / 20000.0) * 65535.0);
}

void writeMotorPWM(int leftUs, int rightUs) {
  currentLeftUs  = constrain(leftUs, 1000, 2000);
  currentRightUs = constrain(rightUs, 1000, 2000);
  ledcWrite(PIN_ESC_LEFT, usToDuty(currentLeftUs));
  ledcWrite(PIN_ESC_RIGHT, usToDuty(currentRightUs));
}

String getMotorStatus(int pwm) {
  if (pwm > 1530) {
    int percent = map(pwm, 1500, 2000, 0, 100);
    return "FWD " + String(percent) + "% [" + String(pwm) + "us]";
  } else if (pwm < 1470) {
    int percent = map(pwm, 1500, 1000, 0, 100);
    return "REV " + String(percent) + "% [" + String(pwm) + "us]";
  } else {
    return "STOP [1500us]";
  }
}

String evaluateMotion(int left, int right) {
  if (left == ESC_STOP && right == ESC_STOP) {
    return "STOP";
  } else if (left > 1530 && right > 1530) {
    if (left > right + 40) return "FORWARD RIGHT";
    else if (right > left + 40) return "FORWARD LEFT";
    else return "FORWARD STRAIGHT";
  } else if (left < 1470 && right < 1470) {
    if (left < right - 40) return "REVERSE RIGHT";
    else if (right < left - 40) return "REVERSE LEFT";
    else return "REVERSE STRAIGHT";
  } else if (left > 1530 && right < 1470) {
    return "SPIN RIGHT";
  } else if (left < 1470 && right > 1530) {
    return "SPIN LEFT";
  } else {
    return "TURNING TRIM";
  }
}

// ============================================================================
// 2. PAN & TILT SERVO CONFIGURATION (PINS 18 & 19)
// ============================================================================
#define SERVO_PAN_PIN   18
#define SERVO_TILT_PIN  19

Servo panServo;
Servo tiltServo;

int panAngle  = 90;
int tiltAngle = 90;
const int SERVO_STEP_DEG = 10;
const int MIN_PAN  = 0,   MAX_PAN  = 180;
const int MIN_TILT = 15,  MAX_TILT = 165;

// ============================================================================
// 3. PHYSICAL BUTTONS (PINS 25, 26, 27, 14)
// ============================================================================
#define BTN_LEFT   25
#define BTN_RIGHT  26
#define BTN_UP     27
#define BTN_DOWN   14

unsigned long lastBtnCheck = 0;
const unsigned long BTN_REPEAT_DELAY_MS = 350;
const unsigned long BTN_REPEAT_RATE_MS = 120;
unsigned long btnLeftHoldStart = 0,  btnLeftLastStep = 0;
unsigned long btnRightHoldStart = 0, btnRightLastStep = 0;
unsigned long btnUpHoldStart = 0,    btnUpLastStep = 0;
unsigned long btnDownHoldStart = 0,  btnDownLastStep = 0;

// ============================================================================
// 4. GPS HARDWARE SERIAL (UART2)
// ============================================================================
#define RXD2 12  // Connects to GPS TXD
#define TXD2 13  // Connects to GPS RXD
#define GPS_BAUDRATE 9600

TinyGPSPlus gps;

// ============================================================================
// 5. HC-SR04 ULTRASONIC SENSOR
// ============================================================================
#define TRIG_PIN 5
#define ECHO_PIN 4
#define SOUND_SPEED 0.0343 // cm/us

float latestDistance = -1.0;
unsigned long lastSensorRead = 0;
const unsigned long SENSOR_INTERVAL_MS = 300;

float readSinglePulseCM() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 26000);
  if (duration <= 180) return -1.0;
  float cm = (duration * SOUND_SPEED) / 2.0;
  if (cm > 450.0) return -1.0;
  return cm;
}

float readDistanceCM() {
  float s1 = readSinglePulseCM();
  delay(6);
  float s2 = readSinglePulseCM();
  delay(6);
  float s3 = readSinglePulseCM();

  if (s1 < 0 && s2 < 0 && s3 < 0) return -1.0;

  float valid[3];
  int count = 0;
  if (s1 > 0) valid[count++] = s1;
  if (s2 > 0) valid[count++] = s2;
  if (s3 > 0) valid[count++] = s3;

  if (count == 1) return valid[0];
  if (count == 2) return (valid[0] + valid[1]) / 2.0;

  if (valid[0] > valid[1]) { float t = valid[0]; valid[0] = valid[1]; valid[1] = t; }
  if (valid[1] > valid[2]) { float t = valid[1]; valid[1] = valid[2]; valid[2] = t; }
  if (valid[0] > valid[1]) { float t = valid[0]; valid[0] = valid[1]; valid[1] = t; }
  return valid[1];
}

// ============================================================================
// PAN & TILT SERVO EXECUTION
// ============================================================================
void executePanTilt(String cmd) {
  cmd.trim();
  cmd.toUpperCase();

  if (cmd == "LEFT") {
    panAngle = constrain(panAngle - SERVO_STEP_DEG, MIN_PAN, MAX_PAN);
    panServo.write(panAngle);
    Serial.printf("[Servo] LEFT -> Pan: %d°, Tilt: %d°\n", panAngle, tiltAngle);
  } else if (cmd == "RIGHT") {
    panAngle = constrain(panAngle + SERVO_STEP_DEG, MIN_PAN, MAX_PAN);
    panServo.write(panAngle);
    Serial.printf("[Servo] RIGHT -> Pan: %d°, Tilt: %d°\n", panAngle, tiltAngle);
  } else if (cmd == "UP") {
    tiltAngle = constrain(tiltAngle + SERVO_STEP_DEG, MIN_TILT, MAX_TILT);
    tiltServo.write(tiltAngle);
    Serial.printf("[Servo] UP -> Pan: %d°, Tilt: %d°\n", panAngle, tiltAngle);
  } else if (cmd == "DOWN") {
    tiltAngle = constrain(tiltAngle - SERVO_STEP_DEG, MIN_TILT, MAX_TILT);
    tiltServo.write(tiltAngle);
    Serial.printf("[Servo] DOWN -> Pan: %d°, Tilt: %d°\n", panAngle, tiltAngle);
  } else if (cmd == "CENTER") {
    panAngle  = 90;
    tiltAngle = 90;
    panServo.write(panAngle);
    tiltServo.write(tiltAngle);
    Serial.println("[Servo] CENTER -> Pan: 90°, Tilt: 90°");
  } else if (cmd == "STOP") {
    Serial.printf("[Servo] STOP -> Holding Pan: %d°, Tilt: %d°\n", panAngle, tiltAngle);
  }
}

// ============================================================================
// WEB MANUAL MOTOR DRIVING
// ============================================================================
void executeWebMotor(String action) {
  action.trim();
  action.toLowerCase();
  unsigned long now = millis();
  webOverrideUntil = now + 600; // Hold for 600ms unless refreshed

  if (action == "forward") {
    writeMotorPWM(1750, 1750);
  } else if (action == "reverse") {
    writeMotorPWM(1250, 1250);
  } else if (action == "left") {
    writeMotorPWM(1300, 1700); // Spin left
  } else if (action == "right") {
    writeMotorPWM(1700, 1300); // Spin right
  } else if (action == "stop") {
    writeMotorPWM(ESC_STOP, ESC_STOP);
    webOverrideUntil = 0;
  }
  motionState = evaluateMotion(currentLeftUs, currentRightUs);
}

// ============================================================================
// WEB SERVER API HANDLERS (CORS ENABLED)
// ============================================================================
void sendCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");
}

void handlePanTiltLeft()   { executePanTilt("LEFT");   sendCorsHeaders(); server.send(200, "application/json", "{\"success\":true,\"command\":\"LEFT\",\"panAngle\":" + String(panAngle) + ",\"tiltAngle\":" + String(tiltAngle) + "}"); }
void handlePanTiltRight()  { executePanTilt("RIGHT");  sendCorsHeaders(); server.send(200, "application/json", "{\"success\":true,\"command\":\"RIGHT\",\"panAngle\":" + String(panAngle) + ",\"tiltAngle\":" + String(tiltAngle) + "}"); }
void handlePanTiltUp()     { executePanTilt("UP");     sendCorsHeaders(); server.send(200, "application/json", "{\"success\":true,\"command\":\"UP\",\"panAngle\":" + String(panAngle) + ",\"tiltAngle\":" + String(tiltAngle) + "}"); }
void handlePanTiltDown()   { executePanTilt("DOWN");   sendCorsHeaders(); server.send(200, "application/json", "{\"success\":true,\"command\":\"DOWN\",\"panAngle\":" + String(panAngle) + ",\"tiltAngle\":" + String(tiltAngle) + "}"); }
void handlePanTiltStop()   { executePanTilt("STOP");   sendCorsHeaders(); server.send(200, "application/json", "{\"success\":true,\"command\":\"STOP\",\"panAngle\":" + String(panAngle) + ",\"tiltAngle\":" + String(tiltAngle) + "}"); }
void handlePanTiltCenter() { executePanTilt("CENTER"); sendCorsHeaders(); server.send(200, "application/json", "{\"success\":true,\"command\":\"CENTER\",\"panAngle\":90,\"tiltAngle\":90}"); }

void handleMotorForward()  { executeWebMotor("forward"); sendCorsHeaders(); server.send(200, "application/json", "{\"success\":true,\"action\":\"forward\",\"state\":\"" + motionState + "\"}"); }
void handleMotorReverse()  { executeWebMotor("reverse"); sendCorsHeaders(); server.send(200, "application/json", "{\"success\":true,\"action\":\"reverse\",\"state\":\"" + motionState + "\"}"); }
void handleMotorLeft()     { executeWebMotor("left");    sendCorsHeaders(); server.send(200, "application/json", "{\"success\":true,\"action\":\"left\",\"state\":\"" + motionState + "\"}"); }
void handleMotorRight()    { executeWebMotor("right");   sendCorsHeaders(); server.send(200, "application/json", "{\"success\":true,\"action\":\"right\",\"state\":\"" + motionState + "\"}"); }
void handleMotorStop()     { executeWebMotor("stop");    sendCorsHeaders(); server.send(200, "application/json", "{\"success\":true,\"action\":\"stop\",\"state\":\"STOP\"}"); }

void handleMotorSet() {
  sendCorsHeaders();
  if (server.hasArg("left") && server.hasArg("right")) {
    int l = server.arg("left").toInt();
    int r = server.arg("right").toInt();
    webOverrideUntil = millis() + 1000;
    writeMotorPWM(l, r);
    motionState = evaluateMotion(currentLeftUs, currentRightUs);
    server.send(200, "application/json", "{\"success\":true,\"left\":" + String(currentLeftUs) + ",\"right\":" + String(currentRightUs) + ",\"state\":\"" + motionState + "\"}");
  } else {
    server.send(400, "application/json", "{\"success\":false,\"error\":\"Missing left or right parameter\"}");
  }
}

String getMotorJson() {
  int leftPercent = currentLeftUs > 1530 ? map(currentLeftUs, 1500, 2000, 0, 100) : (currentLeftUs < 1470 ? map(currentLeftUs, 1500, 1000, 0, 100) : 0);
  int rightPercent = currentRightUs > 1530 ? map(currentRightUs, 1500, 2000, 0, 100) : (currentRightUs < 1470 ? map(currentRightUs, 1500, 1000, 0, 100) : 0);
  String leftDir = currentLeftUs > 1530 ? "FWD" : (currentLeftUs < 1470 ? "REV" : "STOP");
  String rightDir = currentRightUs > 1530 ? "FWD" : (currentRightUs < 1470 ? "REV" : "STOP");

  String json = "{";
  json += "\"state\":\"" + motionState + "\",";
  json += "\"rc_connected\":" + String(rcSignalActive ? "true" : "false") + ",";
  json += "\"left\":{";
  json += "\"us\":" + String(currentLeftUs) + ",";
  json += "\"percent\":" + String(leftPercent) + ",";
  json += "\"dir\":\"" + leftDir + "\",";
  json += "\"status\":\"" + getMotorStatus(currentLeftUs) + "\"";
  json += "},";
  json += "\"right\":{";
  json += "\"us\":" + String(currentRightUs) + ",";
  json += "\"percent\":" + String(rightPercent) + ",";
  json += "\"dir\":\"" + rightDir + "\",";
  json += "\"status\":\"" + getMotorStatus(currentRightUs) + "\"";
  json += "},";
  json += "\"rc\":{";
  json += "\"ch1Steer\":" + String(rawCh1) + ",";
  json += "\"ch2Throttle\":" + String(rawCh2);
  json += "}";
  json += "}";
  return json;
}

void handleMotors() {
  sendCorsHeaders();
  server.send(200, "application/json", "{\"success\":true,\"motors\":" + getMotorJson() + "}");
}

void handleSensors() {
  sendCorsHeaders();
  String json = "{";
  json += "\"success\":true,";
  json += "\"distance_cm\":" + String(latestDistance > 0 ? latestDistance : -1.0, 1) + ",";
  json += "\"panAngle\":" + String(panAngle) + ",";
  json += "\"tiltAngle\":" + String(tiltAngle) + ",";
  json += "\"gps\":{";
  json += "\"fix\":" + String(gps.location.isValid() ? "true" : "false") + ",";
  json += "\"lat\":" + String(gps.location.lat(), 6) + ",";
  json += "\"lng\":" + String(gps.location.lng(), 6) + ",";
  json += "\"altitude_m\":" + String(gps.altitude.meters(), 1) + ",";
  json += "\"satellites\":" + String(gps.satellites.value());
  json += "},";
  json += "\"motors\":" + getMotorJson();
  json += "}";
  server.send(200, "application/json", json);
}

void handleStatus() {
  sendCorsHeaders();
  String json = "{";
  json += "\"success\":true,";
  json += "\"device\":\"FloodScout Multi-Controller\",";
  json += "\"wifi\":true,";
  json += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
  json += "\"rssi\":" + String(WiFi.RSSI()) + ",";
  json += "\"panAngle\":" + String(panAngle) + ",";
  json += "\"tiltAngle\":" + String(tiltAngle) + ",";
  json += "\"motors\":" + getMotorJson();
  json += "}";
  server.send(200, "application/json", json);
}

void handleOptions() {
  sendCorsHeaders();
  server.send(204);
}

// ============================================================================
// SETUP
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("\n\n========================================");
  Serial.println("FloodScout Multi-Controller Initializing");
  Serial.println("========================================");

  // 1. Initialize Hardware UART 2 for GPS
  Serial2.begin(GPS_BAUDRATE, SERIAL_8N1, RXD2, TXD2);
  Serial.printf("[GPS] Hardware Serial2 started at %d baud\n", GPS_BAUDRATE);

  // 2. Initialize Physical Buttons
  pinMode(BTN_LEFT,  INPUT_PULLUP);
  pinMode(BTN_RIGHT, INPUT_PULLUP);
  pinMode(BTN_UP,    INPUT_PULLUP);
  pinMode(BTN_DOWN,  INPUT_PULLUP);

  // 3. Initialize Ultrasonic Sensor
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);

  // 4. Initialize Servos (Pins 18 & 19)
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);
  panServo.setPeriodHertz(50);
  tiltServo.setPeriodHertz(50);
  panServo.attach(SERVO_PAN_PIN, 500, 2500);
  tiltServo.attach(SERVO_TILT_PIN, 500, 2500);
  panServo.write(panAngle);
  tiltServo.write(tiltAngle);

  // 5. Initialize ESC Thruster Motors & RC Pins
  pinMode(PIN_RC_CH1, INPUT);
  pinMode(PIN_RC_CH2, INPUT);
  ledcAttach(PIN_ESC_LEFT, PWM_FREQ, PWM_RES);
  ledcAttach(PIN_ESC_RIGHT, PWM_FREQ, PWM_RES);

  // 5.1 Force 1500us neutral output at startup to prevent sudden motor spin & arm ESCs
  writeMotorPWM(ESC_STOP, ESC_STOP);
  Serial.println("\n--- Initializing ESCs & RC Receiver ---");
  delay(2000); // Wait for ESCs to complete self-test and recognize neutral signal

  // 5.2 Auto-sample transmitter neutral position
  Serial.println("[RC] Sampling RC center position. Do NOT touch remote sticks...");
  long sum1 = 0, sum2 = 0;
  int count = 0;
  for (int i = 0; i < 20; i++) {
    unsigned long p1 = pulseIn(PIN_RC_CH1, HIGH, 25000);
    unsigned long p2 = pulseIn(PIN_RC_CH2, HIGH, 25000);
    if (p1 > 900 && p1 < 2100 && p2 > 900 && p2 < 2100) {
      sum1 += p1;
      sum2 += p2;
      count++;
    }
    delay(20);
  }

  if (count > 5) {
    rc_mid_ch1 = sum1 / count;
    rc_mid_ch2 = sum2 / count;
    Serial.printf("[RC] Calibration successful -> CH1 Center: %d | CH2 Center: %d\n", rc_mid_ch1, rc_mid_ch2);
  } else {
    Serial.println("[RC] RC signal not detected at boot. Using default fallback centers (1500, 1384).");
  }

  writeMotorPWM(ESC_STOP, ESC_STOP);
  Serial.println("[Motors] Thrusters armed & ready. Move sticks or use web dashboard!\n");

  // 6. Connect to Wi-Fi
  Serial.printf("[Wi-Fi] Connecting to '%s'...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(400);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[Wi-Fi] Connected Successfully!");
    Serial.print("[Wi-Fi] ESP32 IP: http://");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[Wi-Fi] Connection timed out. System will continue offline.");
  }

  // 7. Register Web Server Routes
  server.on("/api/pan-tilt/left",   HTTP_GET, handlePanTiltLeft);
  server.on("/api/pan-tilt/right",  HTTP_GET, handlePanTiltRight);
  server.on("/api/pan-tilt/up",     HTTP_GET, handlePanTiltUp);
  server.on("/api/pan-tilt/down",   HTTP_GET, handlePanTiltDown);
  server.on("/api/pan-tilt/stop",   HTTP_GET, handlePanTiltStop);
  server.on("/api/pan-tilt/center", HTTP_GET, handlePanTiltCenter);
  server.on("/api/pan-tilt/status", HTTP_GET, handleStatus);
  server.on("/api/sensors",         HTTP_GET, handleSensors);
  server.on("/api/motors",          HTTP_GET, handleMotors);

  server.on("/api/motor/forward",   HTTP_GET, handleMotorForward);
  server.on("/api/motor/reverse",   HTTP_GET, handleMotorReverse);
  server.on("/api/motor/left",      HTTP_GET, handleMotorLeft);
  server.on("/api/motor/right",     HTTP_GET, handleMotorRight);
  server.on("/api/motor/stop",      HTTP_GET, handleMotorStop);
  server.on("/api/motor/set",       HTTP_GET, handleMotorSet);

  // CORS Handlers
  server.on("/api/pan-tilt/left",   HTTP_OPTIONS, handleOptions);
  server.on("/api/pan-tilt/right",  HTTP_OPTIONS, handleOptions);
  server.on("/api/pan-tilt/up",     HTTP_OPTIONS, handleOptions);
  server.on("/api/pan-tilt/down",   HTTP_OPTIONS, handleOptions);
  server.on("/api/pan-tilt/stop",   HTTP_OPTIONS, handleOptions);
  server.on("/api/pan-tilt/center", HTTP_OPTIONS, handleOptions);
  server.on("/api/pan-tilt/status", HTTP_OPTIONS, handleOptions);
  server.on("/api/sensors",         HTTP_OPTIONS, handleOptions);
  server.on("/api/motors",          HTTP_OPTIONS, handleOptions);
  server.on("/api/motor/forward",   HTTP_OPTIONS, handleOptions);
  server.on("/api/motor/reverse",   HTTP_OPTIONS, handleOptions);
  server.on("/api/motor/left",      HTTP_OPTIONS, handleOptions);
  server.on("/api/motor/right",     HTTP_OPTIONS, handleOptions);
  server.on("/api/motor/stop",      HTTP_OPTIONS, handleOptions);
  server.on("/api/motor/set",       HTTP_OPTIONS, handleOptions);

  server.begin();
  Serial.println("[Web Server] HTTP Server Started. All systems ready!");
}

// ============================================================================
// MAIN LOOP
// ============================================================================
void loop() {
  unsigned long now = millis();

  // 1. Service Web Server Requests
  server.handleClient();

  // 2. Continually parse NMEA GPS sentences
  while (Serial2.available() > 0) {
    gps.encode(Serial2.read());
  }

  // 3. Periodic Ultrasonic Distance Readings (every 300ms)
  if (now - lastSensorRead >= SENSOR_INTERVAL_MS) {
    lastSensorRead = now;
    latestDistance = readDistanceCM();
  }

  // 4. Physical Push Buttons for Pan/Tilt
  if (now - lastBtnCheck >= 25) {
    lastBtnCheck = now;
    bool leftActive  = (digitalRead(BTN_LEFT)  == LOW);
    bool rightActive = (digitalRead(BTN_RIGHT) == LOW);
    bool upActive    = (digitalRead(BTN_UP)    == LOW);
    bool downActive  = (digitalRead(BTN_DOWN)  == LOW);

    if (leftActive) {
      if (btnLeftHoldStart == 0) { btnLeftHoldStart = now; btnLeftLastStep = now; executePanTilt("LEFT"); }
      else if (now - btnLeftHoldStart > BTN_REPEAT_DELAY_MS && now - btnLeftLastStep > BTN_REPEAT_RATE_MS) { btnLeftLastStep = now; executePanTilt("LEFT"); }
    } else { btnLeftHoldStart = 0; }

    if (rightActive) {
      if (btnRightHoldStart == 0) { btnRightHoldStart = now; btnRightLastStep = now; executePanTilt("RIGHT"); }
      else if (now - btnRightHoldStart > BTN_REPEAT_DELAY_MS && now - btnRightLastStep > BTN_REPEAT_RATE_MS) { btnRightLastStep = now; executePanTilt("RIGHT"); }
    } else { btnRightHoldStart = 0; }

    if (upActive) {
      if (btnUpHoldStart == 0) { btnUpHoldStart = now; btnUpLastStep = now; executePanTilt("UP"); }
      else if (now - btnUpHoldStart > BTN_REPEAT_DELAY_MS && now - btnUpLastStep > BTN_REPEAT_RATE_MS) { btnUpLastStep = now; executePanTilt("UP"); }
    } else { btnUpHoldStart = 0; }

    if (downActive) {
      if (btnDownHoldStart == 0) { btnDownHoldStart = now; btnDownLastStep = now; executePanTilt("DOWN"); }
      else if (now - btnDownHoldStart > BTN_REPEAT_DELAY_MS && now - btnDownLastStep > BTN_REPEAT_RATE_MS) { btnDownLastStep = now; executePanTilt("DOWN"); }
    } else { btnDownHoldStart = 0; }
  }

  // 5. RC Receiver Pulse Reading & ESC Thruster Control (every 40ms)
  if (now - lastRcReadTime >= 40) {
    lastRcReadTime = now;

    // Only read RC if no active web override
    if (now >= webOverrideUntil) {
      unsigned long r1 = pulseIn(PIN_RC_CH1, HIGH, 25000);
      unsigned long r2 = pulseIn(PIN_RC_CH2, HIGH, 25000);

      // Check if RC receiver is actively transmitting valid 50Hz signals
      if (r1 >= 900 && r1 <= 2100 && r2 >= 900 && r2 <= 2100) {
        rcSignalActive = true;
        rawCh1 = (int)r1;
        rawCh2 = (int)r2;

        int steer = rawCh1 - rc_mid_ch1;
        int throttle = rawCh2 - rc_mid_ch2;

        // Apply a 45us deadband to prevent stick jitter near center
        if (abs(steer) < 45) steer = 0;
        if (abs(throttle) < 45) throttle = 0;

        int leftOut  = ESC_STOP;
        int rightOut = ESC_STOP;

        // Differential thrust mixing
        if (steer != 0 || throttle != 0) {
          leftOut  = ESC_STOP + throttle + steer;
          rightOut = ESC_STOP + throttle - steer;
        }

        writeMotorPWM(leftOut, rightOut);
        motionState = evaluateMotion(currentLeftUs, currentRightUs);
      } else {
        rcSignalActive = false;
        // Failsafe: stop motors if RC signal is lost and no web override
        writeMotorPWM(ESC_STOP, ESC_STOP);
        motionState = "STOP";
        if (now - lastFailsafePrintTime > 1500) {
          lastFailsafePrintTime = now;
          Serial.println("[WARNING] RC signal lost! Motors stopped.");
        }
      }
    } else {
      // In web manual driving mode
      motionState = evaluateMotion(currentLeftUs, currentRightUs);
    }
  }

  // 6. Periodic Serial Monitor Telemetry Output (100ms interval)
  if (now - lastPrintTime >= 100) {
    lastPrintTime = now;
    Serial.print("[Left Motor]: ");
    Serial.print(getMotorStatus(currentLeftUs));
    Serial.print("  |  [Right Motor]: ");
    Serial.print(getMotorStatus(currentRightUs));
    Serial.print("  -->  Motion: ");
    Serial.println(motionState);
  }
}
