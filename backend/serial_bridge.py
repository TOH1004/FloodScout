"""
serial_bridge.py — USB Serial Communication Bridge for Seeed Studio XIAO ESP32-S3 Sense.

Manages USB Serial connection, executes camera sensor commands (BRIGHTNESS, CONTRAST,
SATURATION, HFLIP, VFLIP), and provides thread-safe bidirectional communication
between FastAPI and the XIAO Arduino firmware.
"""

import os
import time
import json
import logging
import threading
import urllib.request
from typing import Dict, Any, Optional, Tuple

try:
    from dotenv import load_dotenv
    backend_env = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(backend_env):
        load_dotenv(dotenv_path=backend_env, override=True)
    load_dotenv()
except ImportError:
    pass

try:
    import serial
    import serial.tools.list_ports
except ImportError:
    serial = None

logger = logging.getLogger("xiao-serial-bridge")

# Setting name aliases
SETTING_ALIASES = {
    "hflip": "hmirror",
    "resolution": "framesize",
    "de-noise": "denoise",
    "exposure_level": "ae_level",
    "awb_enable": "awb",
    "advanced_awb": "awb_gain",
    "manual_awb": "wb_mode",
    "aec_enable": "aec",
    "night_mode": "aec2",
    "gma_enable": "raw_gma",
    "lens_correction": "lenc",
}

# Permitted ranges for camera sensor settings
VALID_SETTINGS = {
    "xclk": (5, 40),
    "framesize": (0, 13),
    "quality": (4, 63),
    "brightness": (-3, 3),
    "contrast": (-3, 3),
    "saturation": (-4, 4),
    "sharpness": (-3, 3),
    "denoise": (0, 8),
    "ae_level": (-5, 5),
    "gainceiling": (0, 511),
    "special_effect": (0, 6),
    "awb": (0, 1),
    "awb_gain": (0, 1),
    "wb_mode": (0, 4),
    "aec": (0, 1),
    "aec2": (0, 1),
    "agc": (0, 1),
    "raw_gma": (0, 1),
    "lenc": (0, 1),
    "hmirror": (0, 1),
    "vflip": (0, 1),
    "bpc": (0, 1),
    "wpc": (0, 1),
    "colorbar": (0, 1),
}


class XiaoSerialBridge:
    """Thread-safe USB Serial manager for Seeed XIAO ESP32-S3 camera control."""

    def __init__(self, port: Optional[str] = None, baud_rate: int = 115200):
        self.configured_port = port or os.getenv("XIAO_SERIAL_PORT", "COM4")
        self.baud_rate = int(os.getenv("XIAO_SERIAL_BAUD", str(baud_rate)))
        self.active_port: Optional[str] = None
        self._serial: Optional[Any] = None
        self._lock = threading.Lock()
        self.last_error: Optional[str] = None

        # Current cached hardware settings on the device
        self.settings: Dict[str, int] = {
            "xclk": 20,
            "framesize": 4,      # QVGA (320x240)
            "quality": 12,
            "brightness": 0,
            "contrast": 0,
            "saturation": 0,
            "sharpness": 0,
            "denoise": 0,
            "ae_level": 0,
            "gainceiling": 0,
            "special_effect": 0,
            "awb": 1,
            "awb_gain": 1,
            "wb_mode": 0,
            "aec": 1,
            "aec2": 0,
            "agc": 1,
            "raw_gma": 1,
            "lenc": 1,
            "hmirror": 0,
            "vflip": 0,
            "bpc": 0,
            "wpc": 1,
            "colorbar": 0,
        }

        # Wi-Fi HTTP Control (ESP32 CameraWebServer)
        self.xiao_ip = (os.getenv("XIAO_IP") or "").strip().rstrip("/")
        if self.xiao_ip and not self.xiao_ip.startswith("http"):
            self.xiao_ip = f"http://{self.xiao_ip}"
        self.mode: str = "wifi" if self.xiao_ip else "serial"

        # Connection throttling
        self._last_connect_attempt: float = 0.0
        self._reconnect_interval: float = 3.0

        # Attempt initial non-blocking connection
        self.connect()

    def find_xiao_port(self) -> Optional[str]:
        """Auto-detect the serial port if the specified one isn't available."""
        if not serial:
            return None

        pan_tilt_port = (os.getenv("PAN_TILT_SERIAL_PORT", "COM5") if os.getenv("PAN_TILT_MODE") == "serial" else "").upper()
        available_ports = [
            p for p in serial.tools.list_ports.comports()
            if not (pan_tilt_port and p.device.upper() == pan_tilt_port)
        ]

        # 1. First check if configured_port exists in available ports
        for p in available_ports:
            if self.configured_port and p.device.upper() == self.configured_port.upper():
                return p.device

        # 2. Look for Espressif VID (0x303A) or common ESP32 USB descriptions
        for p in available_ports:
            # Check USB VID
            if hasattr(p, "vid") and p.vid == 0x303A:
                logger.info(f"Auto-detected Espressif device on {p.device} ({p.description})")
                return p.device
            # Check description keywords
            desc = (p.description or "").lower()
            if "xiao" in desc or "esp32" in desc or "cp210" in desc:
                logger.info(f"Detected likely camera microcontroller on {p.device} ({p.description})")
                return p.device

        # 3. Fallback to configured port if any ports exist
        if len(available_ports) == 1:
            logger.info(f"Only one serial port present ({available_ports[0].device}); selecting it.")
            return available_ports[0].device

        return self.configured_port

    def connect(self, force: bool = False) -> bool:
        """Connect to XIAO via Wi-Fi or USB Serial."""
        now = time.time()
        if not force and (now - self._last_connect_attempt) < self._reconnect_interval:
            return self.is_connected()
        self._last_connect_attempt = now

        # 1. Attempt Wi-Fi HTTP connection if XIAO_IP is configured
        if self.xiao_ip:
            try:
                req_url = f"{self.xiao_ip}/status"
                req = urllib.request.Request(req_url, headers={"User-Agent": "FloodScout/2.0"})
                with urllib.request.urlopen(req, timeout=0.4) as resp:
                    if resp.status == 200:
                        data = json.loads(resp.read().decode("utf-8"))
                        for k, v in data.items():
                            k_lower = k.lower()
                            k_lower = SETTING_ALIASES.get(k_lower, k_lower)
                            if k_lower in self.settings:
                                try:
                                    self.settings[k_lower] = int(v)
                                except (ValueError, TypeError):
                                    pass
                        self.mode = "wifi"
                        clean_ip = self.xiao_ip.replace("http://", "").replace("https://", "")
                        self.active_port = f"Wi-Fi ({clean_ip})"
                        self.last_error = None
                        logger.info(f"Connected to XIAO over Wi-Fi: {self.active_port}")
                        return True
            except Exception as e:
                logger.debug(f"Wi-Fi connection to {self.xiao_ip} failed: {e}")

        # 2. Fallback to USB Serial
        if not serial:
            self.last_error = "pyserial library is not installed and Wi-Fi unreachable"
            return False

        with self._lock:
            if self._serial and self._serial.is_open:
                return True

            target_port = self.find_xiao_port()
            if not target_port:
                self.last_error = f"Port '{self.configured_port}' not found"
                return False

            try:
                logger.info(f"Connecting to XIAO USB Serial on {target_port} at {self.baud_rate} baud...")
                self._serial = serial.Serial(
                    port=target_port,
                    baudrate=self.baud_rate,
                    timeout=0.6,
                    write_timeout=0.6,
                )
                self.mode = "serial"
                self.active_port = target_port
                self.last_error = None
                logger.info(f"Successfully connected to XIAO on {target_port}")
                # Query initial hardware status
                self._query_initial_status_locked()
                return True
            except Exception as e:
                self._serial = None
                self.active_port = None
                self.last_error = str(e)
                logger.warning(f"Could not connect to XIAO on {target_port}: {e}")
                return False

    def _query_initial_status_locked(self) -> None:
        """Send STATUS query to obtain current sensor values from XIAO."""
        if not self._serial or not self._serial.is_open:
            return
        try:
            self._serial.reset_input_buffer()
            self._serial.write(b"STATUS\n")
            self._serial.flush()
            line = self._serial.readline().decode("utf-8", errors="ignore").strip()
            if line.startswith("OK:STATUS:"):
                # e.g. OK:STATUS:BRIGHTNESS=0,CONTRAST=0,SATURATION=0,HFLIP=0,VFLIP=0
                pairs = line[len("OK:STATUS:"):].split(",")
                for pair in pairs:
                    if "=" in pair:
                        k, v = pair.split("=", 1)
                        k = k.lower().strip()
                        if k in self.settings:
                            try:
                                self.settings[k] = int(v.strip())
                            except ValueError:
                                pass
                logger.info(f"Initialized camera settings from XIAO: {self.settings}")
        except Exception as e:
            logger.debug(f"Initial status query returned: {e}")

    def is_connected(self) -> bool:
        """Check if serial port or Wi-Fi link is open and responding."""
        if self.mode == "wifi":
            return bool(self.active_port and not self.last_error)
        if not self._serial or not self._serial.is_open:
            return False
        return True

    def disconnect(self) -> None:
        """Cleanly close the connection."""
        with self._lock:
            if self._serial:
                try:
                    self._serial.close()
                except Exception:
                    pass
                self._serial = None
            self.active_port = None

    def send_command(self, setting: str, value: int) -> Tuple[bool, str]:
        """
        Send a camera sensor command to XIAO via Wi-Fi HTTP or USB Serial.
        """
        setting_lower = setting.lower().strip()
        setting_lower = SETTING_ALIASES.get(setting_lower, setting_lower)
        if setting_lower not in VALID_SETTINGS:
            return False, f"Unsupported camera setting: '{setting}'"

        min_val, max_val = VALID_SETTINGS[setting_lower]
        if not (min_val <= value <= max_val):
            return False, f"Value {value} out of range [{min_val}, {max_val}] for {setting_lower}"

        # 1. Wi-Fi HTTP Control (ESP32 CameraWebServer)
        if self.mode == "wifi" and self.xiao_ip:
            try:
                ctrl_url = f"{self.xiao_ip}/control?var={setting_lower}&val={value}"
                req = urllib.request.Request(ctrl_url, headers={"User-Agent": "FloodScout/2.0"})
                with urllib.request.urlopen(req, timeout=2.0) as resp:
                    if resp.status == 200:
                        self.settings[setting_lower] = value
                        self.last_error = None
                        return True, f"{setting_lower.capitalize()} updated to {value}"
                    return False, f"XIAO returned HTTP {resp.status}"
            except Exception as e:
                self.last_error = str(e)
                return False, f"Wi-Fi camera control error: {e}"

        # 2. USB Serial Control
        if not self.is_connected():
            self.connect(force=True)
            if not self.is_connected():
                return False, f"XIAO disconnected: {self.last_error or 'Serial port unavailable'}"

        with self._lock:
            try:
                cmd_str = f"{setting_lower.upper()}:{value}\n"
                self._serial.reset_input_buffer()
                self._serial.write(cmd_str.encode("utf-8"))
                self._serial.flush()

                # Read response line with timeout
                start_t = time.time()
                resp_line = ""
                while (time.time() - start_t) < 0.8:
                    line = self._serial.readline().decode("utf-8", errors="ignore").strip()
                    if line:
                        resp_line = line
                        break

                if not resp_line:
                    return False, f"No response from XIAO (command: {cmd_str.strip()})"

                if resp_line.startswith("OK:"):
                    self.settings[setting_lower] = value
                    self.last_error = None
                    return True, f"{setting_lower.capitalize()} updated to {value}"
                elif resp_line.startswith("ERROR:"):
                    err_reason = resp_line.split(":", 1)[1] if ":" in resp_line else resp_line
                    return False, f"XIAO error: {err_reason}"
                else:
                    self.settings[setting_lower] = value
                    return True, f"Acknowledged: {resp_line}"

            except Exception as e:
                self.last_error = str(e)
                try:
                    self._serial.close()
                except Exception:
                    pass
                self._serial = None
                self.active_port = None
                return False, f"Serial communication error: {e}"

    def get_status(self) -> Dict[str, Any]:
        """Return the current camera control bridge status."""
        now = time.time()
        if self.mode == "wifi" and self.xiao_ip:
            if self.is_connected() or (now - self._last_connect_attempt >= self._reconnect_interval):
                self._last_connect_attempt = now
                try:
                    req_url = f"{self.xiao_ip}/status"
                    req = urllib.request.Request(req_url, headers={"User-Agent": "FloodScout/2.0"})
                    with urllib.request.urlopen(req, timeout=0.4) as resp:
                        if resp.status == 200:
                            data = json.loads(resp.read().decode("utf-8"))
                            for k, v in data.items():
                                k_lower = k.lower()
                                k_lower = SETTING_ALIASES.get(k_lower, k_lower)
                                if k_lower in self.settings:
                                    try:
                                        self.settings[k_lower] = int(v)
                                    except (ValueError, TypeError):
                                        pass
                            self.last_error = None
                            clean_ip = self.xiao_ip.replace("http://", "").replace("https://", "")
                            self.active_port = f"Wi-Fi ({clean_ip})"
                            return {
                                "connected": True,
                                "port": self.active_port,
                                "mode": "wifi",
                                "last_error": None,
                                "settings": self.settings.copy(),
                            }
                except Exception as e:
                    self.last_error = str(e)
                    self.active_port = None

        connected = self.is_connected()
        if not connected and (now - self._last_connect_attempt >= self._reconnect_interval):
            self.connect()
            connected = self.is_connected()

        return {
            "connected": connected,
            "port": self.active_port or self.configured_port,
            "mode": self.mode,
            "baud_rate": self.baud_rate if self.mode == "serial" else None,
            "last_error": self.last_error if not connected else None,
            "settings": self.settings.copy(),
        }
