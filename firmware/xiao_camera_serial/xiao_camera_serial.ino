/**
 * FloodScout — Seeed Studio XIAO ESP32-S3 Sense
 * USB Serial Camera Control Extension (Comprehensive Sensor Settings)
 * 
 * Includes all ESP32 Camera hardware registers:
 * - XCLK (MHz): 10, 20
 * - Resolution (Framesize): QVGA(320x240), VGA, HD, UXGA, etc.
 * - Quality (JPEG compression): 4 to 63
 * - Brightness: -3 to 3
 * - Contrast: -3 to 3
 * - Saturation: -4 to 4
 * - Sharpness: -3 to 3
 * - De-Noise: 0 (Auto/Off) to 8
 * - Exposure Level (AE Level): -5 to 5
 * - Gainceiling: 0 to 511
 * - Special Effect: 0 (No Effect) to 6 (Sepia)
 * - AWB Enable (White Balance): 0 or 1
 * - Advanced AWB (AWB Gain): 0 or 1
 * - Manual AWB / Mode (0=Auto, 1=Sunny, 2=Cloudy, 3=Office, 4=Home)
 * - AEC Enable (Auto Exposure): 0 or 1
 * - Night Mode (AEC2 DSP): 0 or 1
 * - AGC (Auto Gain Control): 0 or 1
 * - GMA Enable: 0 or 1
 * - Lens Correction: 0 or 1
 * - H-Mirror: 0 or 1
 * - V-Flip: 0 or 1
 * - BPC (Black Pixel Correction): 0 or 1
 * - WPC (White Pixel Correction): 0 or 1
 * - Color Bar: 0 or 1
 * 
 * Commands received via USB Serial at 115200 baud:
 *   SETTING_NAME:VALUE\n
 *   STATUS\n
 */

#include "esp_camera.h"

static String inputBuffer = "";
static int current_xclk_mhz = 20;

// Forward declaration
void handleCameraCommand(const String& cmd);

/**
 * Call this inside your Arduino loop().
 * Reads non-blocking from Serial without interrupting camera capture or video stream.
 */
void processSerialCommands() {
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == '\r') continue;
    if (c == '\n') {
      inputBuffer.trim();
      if (inputBuffer.length() > 0) {
        handleCameraCommand(inputBuffer);
      }
      inputBuffer = "";
    } else {
      if (inputBuffer.length() < 128) {
        inputBuffer += c;
      }
    }
  }
}

/**
 * Parse and apply camera sensor settings
 */
void handleCameraCommand(const String& cmd) {
  sensor_t *s = esp_camera_sensor_get();
  if (!s) {
    Serial.println("ERROR:CAMERA_NOT_INITIALIZED");
    return;
  }

  // STATUS / PING command
  if (cmd.equalsIgnoreCase("STATUS") || cmd.equalsIgnoreCase("PING")) {
    Serial.printf(
      "OK:STATUS:framesize=%d,quality=%d,brightness=%d,contrast=%d,saturation=%d,"
      "sharpness=%d,denoise=%d,ae_level=%d,gainceiling=%d,special_effect=%d,"
      "awb=%d,awb_gain=%d,wb_mode=%d,aec=%d,aec2=%d,agc=%d,raw_gma=%d,lenc=%d,"
      "hmirror=%d,vflip=%d,bpc=%d,wpc=%d,colorbar=%d,xclk=%d\n",
      s->status.framesize, s->status.quality, s->status.brightness, s->status.contrast,
      s->status.saturation, s->status.sharpness, s->status.denoise, s->status.ae_level,
      s->status.gainceiling, s->status.special_effect, s->status.awb, s->status.awb_gain,
      s->status.wb_mode, s->status.aec, s->status.aec2, s->status.agc, s->status.raw_gma,
      s->status.lenc, s->status.hmirror, s->status.vflip, s->status.bpc, s->status.wpc,
      s->status.colorbar, current_xclk_mhz
    );
    return;
  }

  int colonIndex = cmd.indexOf(':');
  if (colonIndex == -1) {
    Serial.println("ERROR:INVALID_FORMAT");
    return;
  }

  String key = cmd.substring(0, colonIndex);
  String valStr = cmd.substring(colonIndex + 1);
  key.toUpperCase();
  valStr.trim();
  int val = valStr.toInt();

  // 1. Resolution / Framesize
  if (key == "FRAMESIZE" || key == "RESOLUTION") {
    if (val < 0 || val > 13) { Serial.println("ERROR:INVALID_VALUE"); return; }
    if (s->set_framesize) {
      s->set_framesize(s, (framesize_t)val);
      Serial.printf("OK:FRAMESIZE:%d\n", val);
    } else {
      Serial.println("ERROR:UNSUPPORTED_SETTING");
    }
  }
  // 2. JPEG Quality (4 to 63, lower is higher quality)
  else if (key == "QUALITY") {
    if (val < 4 || val > 63) { Serial.println("ERROR:INVALID_VALUE"); return; }
    if (s->set_quality) {
      s->set_quality(s, val);
      Serial.printf("OK:QUALITY:%d\n", val);
    } else {
      Serial.println("ERROR:UNSUPPORTED_SETTING");
    }
  }
  // 3. Brightness (-3 to 3)
  else if (key == "BRIGHTNESS") {
    if (val < -3 || val > 3) { Serial.println("ERROR:INVALID_VALUE"); return; }
    if (s->set_brightness) {
      s->set_brightness(s, val);
      Serial.printf("OK:BRIGHTNESS:%d\n", val);
    } else {
      Serial.println("ERROR:UNSUPPORTED_SETTING");
    }
  }
  // 4. Contrast (-3 to 3)
  else if (key == "CONTRAST") {
    if (val < -3 || val > 3) { Serial.println("ERROR:INVALID_VALUE"); return; }
    if (s->set_contrast) {
      s->set_contrast(s, val);
      Serial.printf("OK:CONTRAST:%d\n", val);
    } else {
      Serial.println("ERROR:UNSUPPORTED_SETTING");
    }
  }
  // 5. Saturation (-4 to 4)
  else if (key == "SATURATION") {
    if (val < -4 || val > 4) { Serial.println("ERROR:INVALID_VALUE"); return; }
    if (s->set_saturation) {
      s->set_saturation(s, val);
      Serial.printf("OK:SATURATION:%d\n", val);
    } else {
      Serial.println("ERROR:UNSUPPORTED_SETTING");
    }
  }
  // 6. Sharpness (-3 to 3)
  else if (key == "SHARPNESS") {
    if (val < -3 || val > 3) { Serial.println("ERROR:INVALID_VALUE"); return; }
    if (s->set_sharpness) {
      s->set_sharpness(s, val);
      Serial.printf("OK:SHARPNESS:%d\n", val);
    } else {
      Serial.println("ERROR:UNSUPPORTED_SETTING");
    }
  }
  // 7. De-Noise (0 to 8)
  else if (key == "DENOISE" || key == "DE-NOISE") {
    if (val < 0 || val > 8) { Serial.println("ERROR:INVALID_VALUE"); return; }
    if (s->set_denoise) {
      s->set_denoise(s, val);
      Serial.printf("OK:DENOISE:%d\n", val);
    } else {
      Serial.println("ERROR:UNSUPPORTED_SETTING");
    }
  }
  // 8. Exposure Level (AE Level: -5 to 5)
  else if (key == "AE_LEVEL" || key == "EXPOSURE_LEVEL") {
    if (val < -5 || val > 5) { Serial.println("ERROR:INVALID_VALUE"); return; }
    if (s->set_ae_level) {
      s->set_ae_level(s, val);
      Serial.printf("OK:AE_LEVEL:%d\n", val);
    } else {
      Serial.println("ERROR:UNSUPPORTED_SETTING");
    }
  }
  // 9. Gainceiling (0 to 511)
  else if (key == "GAINCEILING") {
    if (val < 0 || val > 511) { Serial.println("ERROR:INVALID_VALUE"); return; }
    if (s->set_gainceiling) {
      s->set_gainceiling(s, (gainceiling_t)val);
      Serial.printf("OK:GAINCEILING:%d\n", val);
    } else {
      Serial.println("ERROR:UNSUPPORTED_SETTING");
    }
  }
  // 10. Special Effect (0 to 6)
  else if (key == "SPECIAL_EFFECT") {
    if (val < 0 || val > 6) { Serial.println("ERROR:INVALID_VALUE"); return; }
    if (s->set_special_effect) {
      s->set_special_effect(s, val);
      Serial.printf("OK:SPECIAL_EFFECT:%d\n", val);
    } else {
      Serial.println("ERROR:UNSUPPORTED_SETTING");
    }
  }
  // 11. AWB Enable (0 or 1)
  else if (key == "AWB" || key == "AWB_ENABLE") {
    if (val != 0 && val != 1) { Serial.println("ERROR:INVALID_VALUE"); return; }
    if (s->set_whitebal) {
      s->set_whitebal(s, val);
      Serial.printf("OK:AWB:%d\n", val);
    } else {
      Serial.println("ERROR:UNSUPPORTED_SETTING");
    }
  }
  // 12. Advanced AWB (AWB Gain: 0 or 1)
  else if (key == "AWB_GAIN" || key == "ADVANCED_AWB") {
    if (val != 0 && val != 1) { Serial.println("ERROR:INVALID_VALUE"); return; }
    if (s->set_awb_gain) {
      s->set_awb_gain(s, val);
      Serial.printf("OK:AWB_GAIN:%d\n", val);
    } else {
      Serial.println("ERROR:UNSUPPORTED_SETTING");
    }
  }
  // 13. Manual AWB / WB Mode (0 to 4)
  else if (key == "WB_MODE" || key == "MANUAL_AWB") {
    if (val < 0 || val > 4) { Serial.println("ERROR:INVALID_VALUE"); return; }
    if (s->set_wb_mode) {
      s->set_wb_mode(s, val);
      Serial.printf("OK:WB_MODE:%d\n", val);
    } else {
      Serial.println("ERROR:UNSUPPORTED_SETTING");
    }
  }
  // 14. AEC Enable (0 or 1)
  else if (key == "AEC" || key == "AEC_ENABLE") {
    if (val != 0 && val != 1) { Serial.println("ERROR:INVALID_VALUE"); return; }
    if (s->set_exposure_ctrl) {
      s->set_exposure_ctrl(s, val);
      Serial.printf("OK:AEC:%d\n", val);
    } else {
      Serial.println("ERROR:UNSUPPORTED_SETTING");
    }
  }
  // 15. Night Mode (AEC2 DSP: 0 or 1)
  else if (key == "AEC2" || key == "NIGHT_MODE") {
    if (val != 0 && val != 1) { Serial.println("ERROR:INVALID_VALUE"); return; }
    if (s->set_aec2) {
      s->set_aec2(s, val);
      Serial.printf("OK:AEC2:%d\n", val);
    } else {
      Serial.println("ERROR:UNSUPPORTED_SETTING");
    }
  }
  // 16. AGC (Auto Gain Control: 0 or 1)
  else if (key == "AGC") {
    if (val != 0 && val != 1) { Serial.println("ERROR:INVALID_VALUE"); return; }
    if (s->set_gain_ctrl) {
      s->set_gain_ctrl(s, val);
      Serial.printf("OK:AGC:%d\n", val);
    } else {
      Serial.println("ERROR:UNSUPPORTED_SETTING");
    }
  }
  // 17. GMA Enable (0 or 1)
  else if (key == "RAW_GMA" || key == "GMA_ENABLE") {
    if (val != 0 && val != 1) { Serial.println("ERROR:INVALID_VALUE"); return; }
    if (s->set_raw_gma) {
      s->set_raw_gma(s, val);
      Serial.printf("OK:RAW_GMA:%d\n", val);
    } else {
      Serial.println("ERROR:UNSUPPORTED_SETTING");
    }
  }
  // 18. Lens Correction (0 or 1)
  else if (key == "LENC" || key == "LENS_CORRECTION") {
    if (val != 0 && val != 1) { Serial.println("ERROR:INVALID_VALUE"); return; }
    if (s->set_lenc) {
      s->set_lenc(s, val);
      Serial.printf("OK:LENC:%d\n", val);
    } else {
      Serial.println("ERROR:UNSUPPORTED_SETTING");
    }
  }
  // 19. H-Mirror (0 or 1)
  else if (key == "HMIRROR" || key == "HFLIP" || key == "H-MIRROR") {
    if (val != 0 && val != 1) { Serial.println("ERROR:INVALID_VALUE"); return; }
    if (s->set_hmirror) {
      s->set_hmirror(s, val);
      Serial.printf("OK:HMIRROR:%d\n", val);
    } else {
      Serial.println("ERROR:UNSUPPORTED_SETTING");
    }
  }
  // 20. V-Flip (0 or 1)
  else if (key == "VFLIP" || key == "V-FLIP") {
    if (val != 0 && val != 1) { Serial.println("ERROR:INVALID_VALUE"); return; }
    if (s->set_vflip) {
      s->set_vflip(s, val);
      Serial.printf("OK:VFLIP:%d\n", val);
    } else {
      Serial.println("ERROR:UNSUPPORTED_SETTING");
    }
  }
  // 21. BPC (Black Pixel Correction: 0 or 1)
  else if (key == "BPC") {
    if (val != 0 && val != 1) { Serial.println("ERROR:INVALID_VALUE"); return; }
    if (s->set_bpc) {
      s->set_bpc(s, val);
      Serial.printf("OK:BPC:%d\n", val);
    } else {
      Serial.println("ERROR:UNSUPPORTED_SETTING");
    }
  }
  // 22. WPC (White Pixel Correction: 0 or 1)
  else if (key == "WPC") {
    if (val != 0 && val != 1) { Serial.println("ERROR:INVALID_VALUE"); return; }
    if (s->set_wpc) {
      s->set_wpc(s, val);
      Serial.printf("OK:WPC:%d\n", val);
    } else {
      Serial.println("ERROR:UNSUPPORTED_SETTING");
    }
  }
  // 23. Color Bar (0 or 1)
  else if (key == "COLORBAR" || key == "COLOR_BAR") {
    if (val != 0 && val != 1) { Serial.println("ERROR:INVALID_VALUE"); return; }
    if (s->set_colorbar) {
      s->set_colorbar(s, val);
      Serial.printf("OK:COLORBAR:%d\n", val);
    } else {
      Serial.println("ERROR:UNSUPPORTED_SETTING");
    }
  }
  // 24. XCLK MHz (typically 10 or 20 MHz)
  else if (key == "XCLK") {
    if (val < 5 || val > 40) { Serial.println("ERROR:INVALID_VALUE"); return; }
    if (s->set_xclk) {
      s->set_xclk(s, LEDC_TIMER_0, val);
      current_xclk_mhz = val;
      Serial.printf("OK:XCLK:%d\n", val);
    } else {
      current_xclk_mhz = val;
      Serial.printf("OK:XCLK:%d\n", val);
    }
  } else {
    Serial.println("ERROR:UNSUPPORTED_SETTING");
  }
}
