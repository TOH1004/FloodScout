// ========== Pin Definitions ==========
const int PIN_RC_CH1 = 34;      // Receiver CH1 (Steering) - RC onboard mixing MUST be disabled!
const int PIN_RC_CH2 = 35;      // Receiver CH2 (Throttle) - RC onboard mixing MUST be disabled!
const int PIN_ESC_LEFT = 33;    // Left ESC signal
const int PIN_ESC_RIGHT = 32;   // Right ESC signal

// ========== Hardware PWM Configuration (50Hz, 16-bit Resolution) ==========
const int PWM_FREQ = 50;           // 50Hz (Standard servo/ESC refresh rate: 20ms period)
const int PWM_RES = 16;            // 16-bit resolution (0 - 65535)

// Convert pulse width in microseconds to PWM duty cycle: (us / 20000.0) * 65535
uint32_t usToDuty(int us) {
  return (uint32_t)((us / 20000.0) * 65535.0);
}

// Write PWM directly to pins for ESP32 Core 3.x
void writeMotorPWM(int leftUs, int rightUs) {
  ledcWrite(PIN_ESC_LEFT, usToDuty(leftUs));
  ledcWrite(PIN_ESC_RIGHT, usToDuty(rightUs));
}

// ESC stop pulse and RC center reference
const int ESC_STOP = 1500;
int rc_mid_ch1 = 1500;
int rc_mid_ch2 = 1384; // Custom throttle center reference for your transmitter

// Timer for non-blocking serial monitor prints
unsigned long lastPrintTime = 0;

// Helper function: determine individual motor motion status and percentage
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

void setup() {
  Serial.begin(115200);

  pinMode(PIN_RC_CH1, INPUT);
  pinMode(PIN_RC_CH2, INPUT);

  // ESP32 Core 3.x API: bind pin, frequency, and resolution
  ledcAttach(PIN_ESC_LEFT, PWM_FREQ, PWM_RES);
  ledcAttach(PIN_ESC_RIGHT, PWM_FREQ, PWM_RES);

  // 1. Force 1500us neutral output at startup to prevent sudden motor spin
  writeMotorPWM(ESC_STOP, ESC_STOP);
  Serial.println("\n--- System Initializing, arming ESCs ---");
  delay(2000); // Wait for ESCs to complete self-test and recognize neutral signal

  // 2. Auto-sample transmitter neutral position
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
    Serial.print("Calibration successful -> CH1 Center: ");
    Serial.print(rc_mid_ch1);
    Serial.print(" | CH2 Center: ");
    Serial.println(rc_mid_ch2);
  } else {
    Serial.println("RC signal lost or unstable. Using default fallback values.");
  }

  writeMotorPWM(ESC_STOP, ESC_STOP);
  Serial.println("System ready. Move sticks to operate!\n");
}

void loop() {
  unsigned long raw1 = pulseIn(PIN_RC_CH1, HIGH, 30000);
  unsigned long raw2 = pulseIn(PIN_RC_CH2, HIGH, 30000);

  // Failsafe: stop motors immediately if receiver loses signal
  if (raw1 < 900  raw1 > 2100  raw2 < 900  raw2 > 2100) {
    writeMotorPWM(ESC_STOP, ESC_STOP);
    if (millis() - lastPrintTime > 500) {
      Serial.println("[WARNING] RC signal lost! Motors stopped.");
      lastPrintTime = millis();
    }
    delay(20);
    return;
  }

  int steer = (int)raw1 - rc_mid_ch1;
  int throttle = (int)raw2 - rc_mid_ch2;

  // Apply a 45us deadband to prevent stick jitter near center
  if (abs(steer) < 45) steer = 0;
  if (abs(throttle) < 45) throttle = 0;

  int leftOut = ESC_STOP;
  int rightOut = ESC_STOP;

  // Differential thrust mixing
  if (steer != 0  throttle != 0) {
    leftOut  = ESC_STOP + throttle + steer;
    rightOut = ESC_STOP + throttle - steer;
    leftOut  = constrain(leftOut, 1000, 2000);
    rightOut = constrain(rightOut, 1000, 2000);
  }

  // Write outputs to ESCs
  writeMotorPWM(leftOut, rightOut);
  // ========== Serial Monitor Output (100ms interval) ==========
  if (millis() - lastPrintTime >= 100) {
    lastPrintTime = millis();

    Serial.print("[Left Motor]: ");
    Serial.print(getMotorStatus(leftOut));
    Serial.print("  |  [Right Motor]: ");
    Serial.print(getMotorStatus(rightOut));

    // Evaluate boat movement status
    Serial.print("  -->  Motion: ");
    if (leftOut == ESC_STOP && rightOut == ESC_STOP) {
      Serial.println("STOP");
    } else if (leftOut > 1530 && rightOut > 1530) {
      if (leftOut > rightOut + 40) Serial.println("FORWARD RIGHT");
      else if (rightOut > leftOut + 40) Serial.println("FORWARD LEFT");
      else Serial.println("FORWARD STRAIGHT");
    } else if (leftOut < 1470 && rightOut < 1470) {
      if (leftOut < rightOut - 40) Serial.println("REVERSE RIGHT");
      else if (rightOut < leftOut - 40) Serial.println("REVERSE LEFT");
      else Serial.println("REVERSE STRAIGHT");
    } else if (leftOut > 1530 && rightOut < 1470) {
      Serial.println("SPIN RIGHT");
    } else if (leftOut < 1470 && rightOut > 1530) {
      Serial.println("SPIN LEFT");
    } else {
      Serial.println("TURNING TRIM");
    }
  }

  delay(15);
}