#include <WiFi.h>
#include <WebServer.h>
#include <ESP32Servo.h>
#include <TinyGPSPlus.h>

// ============================================================================
// FloodScout — All-in-One Multi-Controller
// 1. Pan & Tilt Arm (Pins 18 & 19) — SG90 / MG90S Positional + Continuous mode
// 2. Ultrasonic Obstacle Sensor (TRIG 5, ECHO 4) — With Glitch & Noise Filter
// 3. NEO-8M Hardware GPS (UART2: RXD2 12, TXD2 13) — TinyGPSPlus NMEA Parser
// 4. Physical Push Buttons (Pins 25, 26, 27, 14) — Debounced & Non-blocking
// ============================================================================

// --- Wi-Fi Credentials ---
const char* WIFI_SSID     = "vivo V30";
const char* WIFI_PASSWORD = "halogoodgood";

WebServer server(80);

// ============================================================================
// 1. SERVO CONFIGURATION
// ============================================================================
#define SERVO_PAN_PIN   18
#define SERVO_TILT_PIN  19

Servo panServo;
Servo tiltServo;

// Set CONTINUOUS_SERVO to false for standard 180° servos (SG90 / MG90S - Default for Camera/Sensor Gimbal)
// Set to true only if you have modified 360° continuous rotation servos
#define CONTINUOUS_SERVO false

// 180° Positional Servos (Default SG90 Gimbal):
int panAngle  = 90;
int tiltAngle = 90;
const int SERVO_STEP_DEG = 10;
const int MIN_PAN  = 0,   MAX_PAN  = 180;
const int MIN_TILT = 15,  MAX_TILT = 165; // Avoid mechanical binding

// 360° Continuous Servos (Speed Microseconds):
const int STOP_US        = 1500;
const int SPEED_SLOW_CW  = 1320;
const int SPEED_SLOW_CCW = 1680;
const unsigned long CONTINUOUS_STEP_MS = 350;

unsigned long panStopAt  = 0;
unsigned long tiltStopAt = 0;
int panTargetSpeed       = STOP_US;
int tiltTargetSpeed      = STOP_US;

// ============================================================================
// 2. PHYSICAL BUTTONS (PINS 25, 26, 27, 14)
// ============================================================================
#define BTN_LEFT   25
#define BTN_RIGHT  26
#define BTN_UP     27
#define BTN_DOWN   14

// Debounce state tracking
unsigned long lastBtnCheck = 0;
const unsigned long BTN_DEBOUNCE_MS = 60;
const unsigned long BTN_REPEAT_DELAY_MS = 350;
const unsigned long BTN_REPEAT_RATE_MS = 120;

unsigned long btnLeftHoldStart  = 0, btnLeftLastStep  = 0;
unsigned long btnRightHoldStart = 0, btnRightLastStep = 0;
unsigned long btnUpHoldStart    = 0, btnUpLastStep    = 0;
unsigned long btnDownHoldStart  = 0, btnDownLastStep  = 0;

// ============================================================================
// 3. GPS HARDWARE SERIAL (UART2)
// ============================================================================
#define RXD2 12  // Connects to GPS module TXD
#define TXD2 13  // Connects to GPS module RXD
#define GPS_BAUDRATE 9600

TinyGPSPlus gps;

// ============================================================================
// 4. HC-SR04 ULTRASONIC SENSOR
// ============================================================================
#define TRIG_PIN 5
#define ECHO_PIN 4
#define SOUND_SPEED 0.0343 // cm/us

float latestDistance = -1.0;
unsigned long lastSensorRead = 0;
const unsigned long SENSOR_INTERVAL_MS = 300; // Fast 300ms live sensor refresh

// Reads distance in CM with noise & ringing rejection
float readSinglePulseCM() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  // 26ms timeout corresponds to ~445 cm max distance
  long duration = pulseIn(ECHO_PIN, HIGH, 26000);
  
  // If timeout (0) or within transducer ringing blind zone (< 180us / ~3.0 cm)
  if (duration <= 180) {
    return -1.0;
  }
  
  float cm = (duration * SOUND_SPEED) / 2.0;
  if (cm > 450.0) return -1.0;
  return cm;
}

// 3-sample median filter to reject acoustic glitches and noise
float readDistanceCM() {
  float s1 = readSinglePulseCM();
  delay(6);
  float s2 = readSinglePulseCM();
  delay(6);
  float s3 = readSinglePulseCM();

  // If all invalid, path is clear
  if (s1 < 0 && s2 < 0 && s3 < 0) return -1.0;

  // Simple median of valid samples
  float valid[3];
  int count = 0;
  if (s1 > 0) valid[count++] = s1;
  if (s2 > 0) valid[count++] = s2;
  if (s3 > 0) valid[count++] = s3;

  if (count == 1) return valid[0];
  if (count == 2) return (valid[0] + valid[1]) / 2.0;
  
  // Sort 3 samples for median
  if (valid[0] > valid[1]) { float t = valid[0]; valid[0] = valid[1]; valid[1] = t; }
  if (valid[1] > valid[2]) { float t = valid[1]; valid[1] = valid[2]; valid[2] = t; }
  if (valid[0] > valid[1]) { float t = valid[0]; valid[0] = valid[1]; valid[1] = t; }
  return valid[1];
}

// ============================================================================
// PAN & TILT MOTOR EXECUTION
// ============================================================================

void applyServoPositions() {
  if (!CONTINUOUS_SERVO) {
    panServo.write(panAngle);
    tiltServo.write(tiltAngle);
  }
}

void executeCommand(String cmd) {
  cmd.trim();
  cmd.toUpperCase();
  unsigned long now = millis();

  if (!CONTINUOUS_SERVO) {
    // --- 180° Positional Servos (SG90 / MG90S) ---
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
      // Hold current angle
      Serial.printf("[Servo] STOP -> Holding Pan: %d°, Tilt: %d°\n", panAngle, tiltAngle);
    }
  } else {
    // --- 360° Continuous Rotation Servos ---
    if (cmd == "LEFT") {
      panTargetSpeed = SPEED_SLOW_CW;
      panStopAt = now + CONTINUOUS_STEP_MS;
      panServo.writeMicroseconds(panTargetSpeed);
    } else if (cmd == "RIGHT") {
      panTargetSpeed = SPEED_SLOW_CCW;
      panStopAt = now + CONTINUOUS_STEP_MS;
      panServo.writeMicroseconds(panTargetSpeed);
    } else if (cmd == "UP") {
      tiltTargetSpeed = SPEED_SLOW_CW;
      tiltStopAt = now + CONTINUOUS_STEP_MS;
      tiltServo.writeMicroseconds(tiltTargetSpeed);
    } else if (cmd == "DOWN") {
      tiltTargetSpeed = SPEED_SLOW_CCW;
      tiltStopAt = now + CONTINUOUS_STEP_MS;
      tiltServo.writeMicroseconds(tiltTargetSpeed);
    } else if (cmd == "STOP" || cmd == "CENTER") {
      panTargetSpeed  = STOP_US;
      tiltTargetSpeed = STOP_US;
      panStopAt       = 0;
      tiltStopAt      = 0;
      panServo.writeMicroseconds(STOP_US);
      tiltServo.writeMicroseconds(STOP_US);
    }
  }
}

// ============================================================================
// WEB SERVER API HANDLERS (FULL CORS ENABLED)
// ============================================================================

void sendCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");
}

void sendActionResponse(String command) {
  sendCorsHeaders();
  String json = "{";
  json += "\"success\":true,";
  json += "\"command\":\"" + command + "\",";
  json += "\"panAngle\":" + String(panAngle) + ",";
  json += "\"tiltAngle\":" + String(tiltAngle) + ",";
  json += "\"ip\":\"" + WiFi.localIP().toString() + "\"";
  json += "}";
  server.send(200, "application/json", json);
}

void handleLeft()   { executeCommand("LEFT");   sendActionResponse("LEFT"); }
void handleRight()  { executeCommand("RIGHT");  sendActionResponse("RIGHT"); }
void handleUp()     { executeCommand("UP");     sendActionResponse("UP"); }
void handleDown()   { executeCommand("DOWN");   sendActionResponse("DOWN"); }
void handleStop()   { executeCommand("STOP");   sendActionResponse("STOP"); }
void handleCenter() { executeCommand("CENTER"); sendActionResponse("CENTER"); }

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
  json += "\"buttons\":{";
  json += "\"left\":" + String(digitalRead(BTN_LEFT) == LOW ? "true" : "false") + ",";
  json += "\"right\":" + String(digitalRead(BTN_RIGHT) == LOW ? "true" : "false") + ",";
  json += "\"up\":" + String(digitalRead(BTN_UP) == LOW ? "true" : "false") + ",";
  json += "\"down\":" + String(digitalRead(BTN_DOWN) == LOW ? "true" : "false");
  json += "}";
  json += "}";
  server.send(200, "application/json", json);
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
  json += "}";
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
  Serial.printf("[GPS] Hardware Serial2 started at %d baud (RX:%d, TX:%d)\n", GPS_BAUDRATE, RXD2, TXD2);

  // 2. Initialize Physical Buttons (INPUT_PULLUP)
  pinMode(BTN_LEFT,  INPUT_PULLUP);
  pinMode(BTN_RIGHT, INPUT_PULLUP);
  pinMode(BTN_UP,    INPUT_PULLUP);
  pinMode(BTN_DOWN,  INPUT_PULLUP);
  Serial.println("[Buttons] Pins 25, 26, 27, 14 initialized with INPUT_PULLUP");

  // 3. Initialize Ultrasonic Sensor
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);
  Serial.printf("[Sensor] HC-SR04 Ultrasonic initialized (TRIG:%d, ECHO:%d)\n", TRIG_PIN, ECHO_PIN);

  // 4. Initialize Servos (Pins 18 & 19)
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);
  panServo.setPeriodHertz(50);
  tiltServo.setPeriodHertz(50);
  panServo.attach(SERVO_PAN_PIN, 500, 2500);
  tiltServo.attach(SERVO_TILT_PIN, 500, 2500);

  if (!CONTINUOUS_SERVO) {
    panServo.write(panAngle);
    tiltServo.write(tiltAngle);
    Serial.printf("[Servos] SG90 180° Positional Servos initialized to Center (Pan: %d°, Tilt: %d°)\n", panAngle, tiltAngle);
  } else {
    panServo.writeMicroseconds(STOP_US);
    tiltServo.writeMicroseconds(STOP_US);
    Serial.println("[Servos] Continuous 360° Servos initialized to STOP (1500us)");
  }

  // 5. Connect to Wi-Fi
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
    Serial.printf("[Wi-Fi] RSSI: %d dBm\n", WiFi.RSSI());
  } else {
    Serial.println("\n[Wi-Fi] Connection timed out. System will continue offline.");
  }

  // 6. Register Web Server Routes
  server.on("/api/pan-tilt/left",   HTTP_GET, handleLeft);
  server.on("/api/pan-tilt/right",  HTTP_GET, handleRight);
  server.on("/api/pan-tilt/up",     HTTP_GET, handleUp);
  server.on("/api/pan-tilt/down",   HTTP_GET, handleDown);
  server.on("/api/pan-tilt/stop",   HTTP_GET, handleStop);
  server.on("/api/pan-tilt/center", HTTP_GET, handleCenter);
  server.on("/api/pan-tilt/status", HTTP_GET, handleStatus);
  server.on("/api/sensors",         HTTP_GET, handleSensors);

  // Register CORS preflight OPTIONS handlers
  server.on("/api/pan-tilt/left",   HTTP_OPTIONS, handleOptions);
  server.on("/api/pan-tilt/right",  HTTP_OPTIONS, handleOptions);
  server.on("/api/pan-tilt/up",     HTTP_OPTIONS, handleOptions);
  server.on("/api/pan-tilt/down",   HTTP_OPTIONS, handleOptions);
  server.on("/api/pan-tilt/stop",   HTTP_OPTIONS, handleOptions);
  server.on("/api/pan-tilt/center", HTTP_OPTIONS, handleOptions);
  server.on("/api/pan-tilt/status", HTTP_OPTIONS, handleOptions);
  server.on("/api/sensors",         HTTP_OPTIONS, handleOptions);

  server.begin();
  Serial.println("[Web Server] HTTP Server Started on Port 80. All 4 hardware ready!");
}

// ============================================================================
// MAIN LOOP
// ============================================================================

void loop() {
  unsigned long now = millis();

  // 1. Service Web Server Requests
  server.handleClient();

  // 2. Continually stream NMEA GPS sentences from UART2
  while (Serial2.available() > 0) {
    gps.encode(Serial2.read());
  }

  // 3. Periodic Ultrasonic Distance Readings
  if (now - lastSensorRead >= SENSOR_INTERVAL_MS) {
    lastSensorRead = now;
    latestDistance = readDistanceCM();

    // Serial Telemetry
    Serial.print("[Sensor] Distance: ");
    if (latestDistance > 0 && latestDistance <= 450.0) {
      Serial.printf("%.1f cm", latestDistance);
    } else {
      Serial.print("Clear (Out of Range)");
    }
    Serial.printf(" | GPS Sats: %d", gps.satellites.value());
    if (gps.location.isValid()) {
      Serial.printf(" | Lat: %.6f, Lng: %.6f, Alt: %.1fm", gps.location.lat(), gps.location.lng(), gps.altitude.meters());
    }
    Serial.println();
  }

  // 4. Physical Push Buttons with Debounce and Repeat
  if (now - lastBtnCheck >= 20) {
    lastBtnCheck = now;

    bool leftActive  = (digitalRead(BTN_LEFT)  == LOW);
    bool rightActive = (digitalRead(BTN_RIGHT) == LOW);
    bool upActive    = (digitalRead(BTN_UP)    == LOW);
    bool downActive  = (digitalRead(BTN_DOWN)  == LOW);

    // Left Button
    if (leftActive) {
      if (btnLeftHoldStart == 0) {
        btnLeftHoldStart = now;
        btnLeftLastStep = now;
        executeCommand("LEFT");
      } else if (now - btnLeftHoldStart > BTN_REPEAT_DELAY_MS && now - btnLeftLastStep > BTN_REPEAT_RATE_MS) {
        btnLeftLastStep = now;
        executeCommand("LEFT");
      }
    } else {
      btnLeftHoldStart = 0;
    }

    // Right Button
    if (rightActive) {
      if (btnRightHoldStart == 0) {
        btnRightHoldStart = now;
        btnRightLastStep = now;
        executeCommand("RIGHT");
      } else if (now - btnRightHoldStart > BTN_REPEAT_DELAY_MS && now - btnRightLastStep > BTN_REPEAT_RATE_MS) {
        btnRightLastStep = now;
        executeCommand("RIGHT");
      }
    } else {
      btnRightHoldStart = 0;
    }

    // Up Button
    if (upActive) {
      if (btnUpHoldStart == 0) {
        btnUpHoldStart = now;
        btnUpLastStep = now;
        executeCommand("UP");
      } else if (now - btnUpHoldStart > BTN_REPEAT_DELAY_MS && now - btnUpLastStep > BTN_REPEAT_RATE_MS) {
        btnUpLastStep = now;
        executeCommand("UP");
      }
    } else {
      btnUpHoldStart = 0;
    }

    // Down Button
    if (downActive) {
      if (btnDownHoldStart == 0) {
        btnDownHoldStart = now;
        btnDownLastStep = now;
        executeCommand("DOWN");
      } else if (now - btnDownHoldStart > BTN_REPEAT_DELAY_MS && now - btnDownLastStep > BTN_REPEAT_RATE_MS) {
        btnDownLastStep = now;
        executeCommand("DOWN");
      }
    } else {
      btnDownHoldStart = 0;
    }
  }

  // 5. Continuous Servo Stop Check (only applies if CONTINUOUS_SERVO is true)
  if (CONTINUOUS_SERVO) {
    if (panStopAt > 0 && now >= panStopAt) {
      panServo.writeMicroseconds(STOP_US);
      panStopAt = 0;
    }
    if (tiltStopAt > 0 && now >= tiltStopAt) {
      tiltServo.writeMicroseconds(STOP_US);
      tiltStopAt = 0;
    }
  }
}
