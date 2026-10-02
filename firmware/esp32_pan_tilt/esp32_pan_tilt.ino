#include <WiFi.h>
#include <WebServer.h>
#include <ESP32Servo.h>
#include <TinyGPSPlus.h>

// ============================================================================
// 1. BLDC 电调 (ESC) 与 HotRC 遥控器配置
// ============================================================================

// ========== Pin Definitions ==========
const int PIN_RC_CH1 = 34;      // 接收机 CH1 (方向) - 遥控器混控必须关闭
const int PIN_RC_CH2 = 35;      // 接收机 CH2 (油门) - 遥控器混控必须关闭
const int PIN_ESC_LEFT = 21;    // 左无刷电机电调 (BLDC Left)
const int PIN_ESC_RIGHT = 16;   // 右无刷电机电调 (BLDC Right)

// 使用 Servo 对象驱动电调，彻底避免底层 LEDC 定时器冲突
Servo escLeft;
Servo escRight;

// 电调中位停止信号与校准基准
const int ESC_STOP = 1500;
int rc_mid_ch1 = 1500;
int rc_mid_ch2 = 1384; // 你的遥控器油门中位基准值

// 全局电调状态追踪 (供 HTTP API 与系统遥测实时读取)
int currentLeftUs = ESC_STOP;
int currentRightUs = ESC_STOP;
String currentMotion = "STOP";
bool rcConnected = false;

// 输出给电调的专用函数
void writeMotorPWM(int leftUs, int rightUs) {
  currentLeftUs = constrain(leftUs, 1000, 2000);
  currentRightUs = constrain(rightUs, 1000, 2000);
  escLeft.writeMicroseconds(currentLeftUs);
  escRight.writeMicroseconds(currentRightUs);
}

// 串口打印计时器
unsigned long lastPrintTime = 0;

// 电机状态解析辅助函数
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

// ============================================================================
// 2. FloodScout — 云台机械臂舵机 (Pan & Tilt) + GPS + 超声波
// ============================================================================

// --- Wi-Fi 设置 ---
const char* WIFI_SSID     = "vivo V30";
const char* WIFI_PASSWORD = "halogoodgood";

WebServer server(80);

// --- 云台舵机引脚与对象 ---
#define SERVO_PAN_PIN   18
#define SERVO_TILT_PIN  19

Servo panServo;
Servo tiltServo;

// 舵机持久角度与步进 (标准 180° 位置舵机：0°=500us, 90°=1500us, 180°=2500us)
int panAngle  = 90;
int tiltAngle = 90;
const int SERVO_STEP = 15; // 每次点击步进 15 度，动作明显

// 角度转微秒高精度换算
int angleToUs(int angle) {
  return map(constrain(angle, 0, 180), 0, 180, 500, 2500);
}

// 执行角度写入并锁定位姿
void applyServoAngles() {
  panServo.writeMicroseconds(angleToUs(panAngle));
  tiltServo.writeMicroseconds(angleToUs(tiltAngle));
}

// --- 物理按钮引脚 (控制云台机械臂) ---
#define BTN_LEFT   25
#define BTN_RIGHT  26
#define BTN_UP     27
#define BTN_DOWN   14

// --- GPS 硬件串口 (UART2) ---
#define RXD2 12  // 接 GPS TXD
#define TXD2 13  // 接 GPS RXD
#define GPS_BAUDRATE 9600

TinyGPSPlus gps;

// --- HC-SR04 超声波引脚 ---
#define TRIG_PIN 5
#define ECHO_PIN 4
#define SOUND_SPEED 0.0343 // cm/us

float latestDistance = -1.0;
unsigned long lastSensorRead = 0;
const unsigned long SENSOR_INTERVAL_MS = 1000;

// ============================================================================
// 超声波读取函数
// ============================================================================

float readDistanceCM() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 25000); // 25ms 测距保护
  if (duration == 0) return -1.0;
  return (duration * SOUND_SPEED) / 2.0;
}

// ============================================================================
// 云台机械臂舵机控制命令 (角度模式：移动并牢牢锁定位置)
// ============================================================================

void executeCommand(String cmd) {
  cmd.trim();
  cmd.toUpperCase();

  if (cmd == "LEFT") {
    panAngle = constrain(panAngle - SERVO_STEP, 0, 180);
    applyServoAngles();
    Serial.printf("[Arm Pan] LEFT -> Angle: %d deg (%d us)\n", panAngle, angleToUs(panAngle));
  } else if (cmd == "RIGHT") {
    panAngle = constrain(panAngle + SERVO_STEP, 0, 180);
    applyServoAngles();
    Serial.printf("[Arm Pan] RIGHT -> Angle: %d deg (%d us)\n", panAngle, angleToUs(panAngle));
  } else if (cmd == "UP") {
    tiltAngle = constrain(tiltAngle - SERVO_STEP, 15, 165);
    applyServoAngles();
    Serial.printf("[Arm Tilt] UP -> Angle: %d deg (%d us)\n", tiltAngle, angleToUs(tiltAngle));
  } else if (cmd == "DOWN") {
    tiltAngle = constrain(tiltAngle + SERVO_STEP, 15, 165);
    applyServoAngles();
    Serial.printf("[Arm Tilt] DOWN -> Angle: %d deg (%d us)\n", tiltAngle, angleToUs(tiltAngle));
  } else if (cmd == "CENTER") {
    panAngle = 90;
    tiltAngle = 90;
    applyServoAngles();
    Serial.println("[Arm] Centered (90 deg / 1500 us)");
  } else if (cmd == "STOP") {
    applyServoAngles();
    Serial.printf("[Arm] Hold Position -> Pan: %d deg, Tilt: %d deg\n", panAngle, tiltAngle);
  }
}

// ============================================================================
// Web Server 路由处理 (全面注入 CORS 跨域头，防止浏览器与手机拦截)
// ============================================================================

void sendCORSHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");
}

void sendActionResponse(String command) {
  sendCORSHeaders();
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

// 支持指定绝对角度: /api/pan-tilt/set?pan=90&tilt=60
void handleSet() {
  if (server.hasArg("pan")) {
    panAngle = constrain(server.arg("pan").toInt(), 0, 180);
  }
  if (server.hasArg("tilt")) {
    tiltAngle = constrain(server.arg("tilt").toInt(), 15, 165);
  }
  applyServoAngles();
  sendActionResponse("SET");
}

void handleStatus() {
  sendCORSHeaders();
  String json = "{";
  json += "\"success\":true,";
  json += "\"device\":\"FloodScout Multi-Controller\",";
  json += "\"wifi\":true,";
  json += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
  json += "\"rssi\":" + String(WiFi.RSSI()) + ",";
  json += "\"panAngle\":" + String(panAngle) + ",";
  json += "\"tiltAngle\":" + String(tiltAngle) + ",";
  json += "\"connected\":true";
  json += "}";
  server.send(200, "application/json", json);
}

// 统一传感器与遥测端点 (超声波 + GPS + BLDC 双电调实时动力)
void handleSensors() {
  sendCORSHeaders();
  int leftPercent = 0;
  String leftDir = "STOP";
  if (currentLeftUs > 1530) {
    leftPercent = map(currentLeftUs, 1500, 2000, 0, 100);
    leftDir = "FWD";
  } else if (currentLeftUs < 1470) {
    leftPercent = map(currentLeftUs, 1500, 1000, 0, 100);
    leftDir = "REV";
  }

  int rightPercent = 0;
  String rightDir = "STOP";
  if (currentRightUs > 1530) {
    rightPercent = map(currentRightUs, 1500, 2000, 0, 100);
    rightDir = "FWD";
  } else if (currentRightUs < 1470) {
    rightPercent = map(currentRightUs, 1500, 1000, 0, 100);
    rightDir = "REV";
  }

  String json = "{";
  json += "\"success\":true,";
  json += "\"panAngle\":" + String(panAngle) + ",";
  json += "\"tiltAngle\":" + String(tiltAngle) + ",";
  json += "\"distance_cm\":" + String(latestDistance, 1) + ",";
  json += "\"gps\":{";
  json += "\"fix\":" + String(gps.location.isValid() ? "true" : "false") + ",";
  json += "\"lat\":" + String(gps.location.lat(), 6) + ",";
  json += "\"lng\":" + String(gps.location.lng(), 6) + ",";
  json += "\"altitude_m\":" + String(gps.altitude.meters(), 1) + ",";
  json += "\"satellites\":" + String(gps.satellites.value());
  json += "},";
  json += "\"motors\":{";
  json += "\"state\":\"" + currentMotion + "\",";
  json += "\"direction\":\"" + currentMotion + "\",";
  json += "\"rc_connected\":" + String(rcConnected ? "true" : "false") + ",";
  json += "\"left\":{\"us\":" + String(currentLeftUs) + ",\"percent\":" + String(leftPercent) + ",\"dir\":\"" + leftDir + "\",\"status\":\"" + getMotorStatus(currentLeftUs) + "\"},";
  json += "\"right\":{\"us\":" + String(currentRightUs) + ",\"percent\":" + String(rightPercent) + ",\"dir\":\"" + rightDir + "\",\"status\":\"" + getMotorStatus(currentRightUs) + "\"}";
  json += "}";
  json += "}";
  server.send(200, "application/json", json);
}

void handleOptions() {
  sendCORSHeaders();
  server.send(204);
}

// ============================================================================
// Setup
// ============================================================================

void setup() {
  Serial.begin(115200);

  // 1. 初始化遥控器接收机引脚
  pinMode(PIN_RC_CH1, INPUT);
  pinMode(PIN_RC_CH2, INPUT);

  // 2. 分配 ESP32 硬件定时器 (0~3 共 4 个定时器供 4 路 PWM 独立使用)
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);

  // 3. 初始化 BLDC 电调 (ESC) - 绑定到 GPIO 21 与 16
  escLeft.setPeriodHertz(50);
  escRight.setPeriodHertz(50);
  escLeft.attach(PIN_ESC_LEFT, 1000, 2000);
  escRight.attach(PIN_ESC_RIGHT, 1000, 2000);

  // 电调输出 1500us 停转中位信号解锁
  writeMotorPWM(ESC_STOP, ESC_STOP);
  Serial.println("\n--- FloodScout Initializing, arming BLDC ESCs ---");
  delay(1500);

  // 4. 初始化机械臂云台舵机 - 绑定到 GPIO 18 与 19 (SG90 500us~2500us)
  panServo.setPeriodHertz(50);
  tiltServo.setPeriodHertz(50);
  panServo.attach(SERVO_PAN_PIN, 500, 2500);
  tiltServo.attach(SERVO_TILT_PIN, 500, 2500);
  applyServoAngles();
  Serial.printf("[Arm Init] Servos attached: Pan Pin %d, Tilt Pin %d -> Initialized at 90 deg\n", SERVO_PAN_PIN, SERVO_TILT_PIN);

  // 5. 自动校准遥控器中位 (使用可靠的 pulseIn 采样)
  Serial.println("Sampling RC center position. Do NOT touch remote sticks...");
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
    Serial.printf("Calibration successful -> CH1 Center: %d | CH2 Center: %d\n", rc_mid_ch1, rc_mid_ch2);
  } else {
    Serial.println("RC signal lost or transmitter offline. Using default fallback values.");
    rc_mid_ch1 = 1500;
    rc_mid_ch2 = 1384;
  }
  writeMotorPWM(ESC_STOP, ESC_STOP);
  Serial.println("BLDC ESCs armed and ready.\n");

  // 6. 初始化 GPS 串口
  Serial2.begin(GPS_BAUDRATE, SERIAL_8N1, RXD2, TXD2);

  // 7. 初始化物理按键
  pinMode(BTN_LEFT,  INPUT_PULLUP);
  pinMode(BTN_RIGHT, INPUT_PULLUP);
  pinMode(BTN_UP,    INPUT_PULLUP);
  pinMode(BTN_DOWN,  INPUT_PULLUP);

  // 8. 初始化超声波
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);

  // 9. 连接 Wi-Fi (持续连接，确保获取 IP)
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWi-Fi Connected!");
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());

  // 10. Web 路由设置
  server.on("/api/pan-tilt/left",   HTTP_GET, handleLeft);
  server.on("/api/pan-tilt/right",  HTTP_GET, handleRight);
  server.on("/api/pan-tilt/up",     HTTP_GET, handleUp);
  server.on("/api/pan-tilt/down",   HTTP_GET, handleDown);
  server.on("/api/pan-tilt/stop",   HTTP_GET, handleStop);
  server.on("/api/pan-tilt/center", HTTP_GET, handleCenter);
  server.on("/api/pan-tilt/set",    HTTP_GET, handleSet);
  server.on("/api/pan-tilt/status", HTTP_GET, handleStatus);
  server.on("/api/sensors",         HTTP_GET, handleSensors);
  server.on("/api/motors",          HTTP_GET, handleSensors);

  server.on("/api/pan-tilt/left",   HTTP_OPTIONS, handleOptions);
  server.on("/api/pan-tilt/right",  HTTP_OPTIONS, handleOptions);
  server.on("/api/pan-tilt/up",     HTTP_OPTIONS, handleOptions);
  server.on("/api/pan-tilt/down",   HTTP_OPTIONS, handleOptions);
  server.on("/api/pan-tilt/stop",   HTTP_OPTIONS, handleOptions);
  server.on("/api/pan-tilt/center", HTTP_OPTIONS, handleOptions);
  server.on("/api/pan-tilt/set",    HTTP_OPTIONS, handleOptions);
  server.on("/api/pan-tilt/status", HTTP_OPTIONS, handleOptions);
  server.on("/api/sensors",         HTTP_OPTIONS, handleOptions);
  server.on("/api/motors",          HTTP_OPTIONS, handleOptions);

  server.begin();
  Serial.println("FloodScout System Ready & Serving Web API.");
}

// ============================================================================
// Main Loop
// ============================================================================

void loop() {
  // 1. 高频处理 Web 请求
  server.handleClient();

  // 2. 解析 GPS 串口流
  while (Serial2.available() > 0) {
    gps.encode(Serial2.read());
  }

  unsigned long now = millis();

  // 3. 超声波与 GPS 定时刷新 (1000ms)
  if (now - lastSensorRead >= SENSOR_INTERVAL_MS) {
    lastSensorRead = now;
    latestDistance = readDistanceCM();

    Serial.print("[Distance] ");
    if (latestDistance > 0 && latestDistance <= 400.0) {
      Serial.print(latestDistance, 1);
      Serial.print(" cm | ");
    } else {
      Serial.print("Clear | ");
    }

    Serial.print("[GPS Satellites] ");
    Serial.print(gps.satellites.value());
    if (gps.location.isValid()) {
      Serial.print(" | Lat: ");
      Serial.print(gps.location.lat(), 6);
      Serial.print(" Lng: ");
      Serial.print(gps.location.lng(), 6);
    }
    if (gps.altitude.isValid()) {
      Serial.print(" | Alt: ");
      Serial.print(gps.altitude.meters(), 1);
      Serial.print(" m");
    }
    Serial.println();
  }

  // 4. 云台机械臂物理按键控制 (长按步进，松开保持锁定)
  static unsigned long lastBtnTime = 0;
  if (now - lastBtnTime >= 50) {
    bool btnMoved = false;
    if (digitalRead(BTN_LEFT) == LOW) {
      panAngle = constrain(panAngle - 1, 0, 180);
      btnMoved = true;
    } else if (digitalRead(BTN_RIGHT) == LOW) {
      panAngle = constrain(panAngle + 1, 0, 180);
      btnMoved = true;
    }

    if (digitalRead(BTN_UP) == LOW) {
      tiltAngle = constrain(tiltAngle - 1, 15, 165);
      btnMoved = true;
    } else if (digitalRead(BTN_DOWN) == LOW) {
      tiltAngle = constrain(tiltAngle + 1, 15, 165);
      btnMoved = true;
    }

    if (btnMoved) {
      applyServoAngles();
      lastBtnTime = now;
    }
  }

  // 5. HotRC 遥控器差速控制 BLDC 无刷电机 (直接 pulseIn 测量，100% 保证电机动力响应)
  unsigned long raw1 = pulseIn(PIN_RC_CH1, HIGH, 25000);
  unsigned long raw2 = pulseIn(PIN_RC_CH2, HIGH, 25000);

  // 失控保护 (Failsafe)
  if (raw1 < 900 || raw1 > 2100 || raw2 < 900 || raw2 > 2100) {
    writeMotorPWM(ESC_STOP, ESC_STOP);
    currentMotion = "STOP";
    rcConnected = false;
    if (now - lastPrintTime > 1000) {
      Serial.println("[WARNING] RC signal lost! BLDC Motors stopped.");
      lastPrintTime = now;
    }
    delay(10);
    return;
  }

  rcConnected = true;
  int steer = (int)raw1 - rc_mid_ch1;
  int throttle = (int)raw2 - rc_mid_ch2;

  // 死区消除微小抖动
  if (abs(steer) < 45) steer = 0;
  if (abs(throttle) < 45) throttle = 0;

  int leftOut = ESC_STOP;
  int rightOut = ESC_STOP;

  // 差速混控计算
  if (steer != 0 || throttle != 0) {
    leftOut  = ESC_STOP + throttle + steer;
    rightOut = ESC_STOP + throttle - steer;
    leftOut  = constrain(leftOut, 1000, 2000);
    rightOut = constrain(rightOut, 1000, 2000);
  }

  // 输出 PWM 到左右两个 BLDC 电调
  writeMotorPWM(leftOut, rightOut);

  // 判断船体运动状态
  if (leftOut == ESC_STOP && rightOut == ESC_STOP) {
    currentMotion = "STOP";
  } else if (leftOut > 1530 && rightOut > 1530) {
    if (leftOut > rightOut + 40) currentMotion = "FORWARD RIGHT";
    else if (rightOut > leftOut + 40) currentMotion = "FORWARD LEFT";
    else currentMotion = "FORWARD STRAIGHT";
  } else if (leftOut < 1470 && rightOut < 1470) {
    if (leftOut < rightOut - 40) currentMotion = "REVERSE RIGHT";
    else if (rightOut < leftOut - 40) currentMotion = "REVERSE LEFT";
    else currentMotion = "REVERSE STRAIGHT";
  } else if (leftOut > 1530 && rightOut < 1470) {
    currentMotion = "SPIN RIGHT";
  } else if (leftOut < 1470 && rightOut > 1530) {
    currentMotion = "SPIN LEFT";
  } else {
    currentMotion = "TURNING TRIM";
  }

  // 电机状态监控输出 (每 100ms 刷新一次)
  if (now - lastPrintTime >= 100) {
    lastPrintTime = now;

    Serial.print("[Left BLDC]: ");
    Serial.print(getMotorStatus(leftOut));
    Serial.print("  |  [Right BLDC]: ");
    Serial.print(getMotorStatus(rightOut));

    Serial.print("  -->  Motion: ");
    Serial.println(currentMotion);
  }

  delay(10);
}
