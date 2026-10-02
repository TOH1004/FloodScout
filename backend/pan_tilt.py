"""
pan_tilt.py — Hardware Abstraction Layer for FloodScout Pan & Tilt Action Sonar.

Provides modular control over simulated (Mock) and physical (ESP32 + SG90 servos)
pan-and-tilt mechanisms on the FloodScout search-and-rescue robot.

Architecture:
  Frontend (Website Buttons)
          ↓
     FastAPI Router (/api/pan-tilt/*)
          ↓
     PanTiltController (ABC)
      ├── MockPanTiltController (Simulated state, 0°–180° clamping)
      └── ESP32PanTiltController (HTTP/Serial adapter for real SG90 + PIZ Action Sonar)
"""

import os
import json
import logging
import threading
import urllib.request
import urllib.error
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

try:
    import serial
    import serial.tools.list_ports
except ImportError:
    serial = None

logger = logging.getLogger("floodscout-pan-tilt")

# ── Defaults & Constants ───────────────────────────────────────────────────────
SUPPORTED_COMMANDS = {"LEFT", "RIGHT", "UP", "DOWN", "CENTER", "STOP"}

# Future continuous movement commands
EXTENDED_COMMANDS = SUPPORTED_COMMANDS | {
    "START_LEFT", "START_RIGHT", "START_UP", "START_DOWN"
}

MIN_ANGLE = 0
MAX_ANGLE = 180
DEFAULT_PAN_ANGLE = 90
DEFAULT_TILT_ANGLE = 90
DEFAULT_SERVO_STEP = 5


def clamp_angle(angle: int, min_val: int = MIN_ANGLE, max_val: int = MAX_ANGLE) -> int:
    """Clamps a servo angle between [min_val, max_val]."""
    return max(min_val, min(max_val, angle))


# ── Base Abstract Controller ──────────────────────────────────────────────────
class PanTiltController(ABC):
    """Abstract interface for FloodScout Pan/Tilt servo actuators."""

    @abstractmethod
    def move_left(self) -> Dict[str, Any]:
        """Pan servo left (decrease azimuth angle)."""
        pass

    @abstractmethod
    def move_right(self) -> Dict[str, Any]:
        """Pan servo right (increase azimuth angle)."""
        pass

    @abstractmethod
    def move_up(self) -> Dict[str, Any]:
        """Tilt servo up (increase elevation angle)."""
        pass

    @abstractmethod
    def move_down(self) -> Dict[str, Any]:
        """Tilt servo down (decrease elevation angle)."""
        pass

    @abstractmethod
    def center(self) -> Dict[str, Any]:
        """Return pan and tilt to neutral 90°/90° position."""
        pass

    @abstractmethod
    def stop(self) -> Dict[str, Any]:
        """Halt continuous motion without altering current angle."""
        pass

    @abstractmethod
    def get_position(self) -> Dict[str, int]:
        """Retrieve current (panAngle, tiltAngle)."""
        pass

    @abstractmethod
    def get_status(self) -> Dict[str, Any]:
        """Retrieve comprehensive status dictionary."""
        pass

    @abstractmethod
    def check_health(self) -> Dict[str, Any]:
        """Check hardware or simulation health."""
        pass

    @abstractmethod
    def execute_command(self, command: str) -> Dict[str, Any]:
        """Execute a string command (LEFT, RIGHT, UP, DOWN, CENTER, STOP)."""
        pass


# ── Mock Mode Controller ──────────────────────────────────────────────────────
class MockPanTiltController(PanTiltController):
    """Simulates physical SG90 servo position and PIZ Sonar orientation in software.

    Maintains pan and tilt angles clamped between 0° and 180°.
    Logs all operations with clean, non-sensitive telemetry.
    """

    def __init__(self, step: Optional[int] = None):
        self._lock = threading.Lock()
        self._pan_angle = DEFAULT_PAN_ANGLE
        self._tilt_angle = DEFAULT_TILT_ANGLE
        if step is None:
            try:
                self._step = int(os.getenv("SERVO_STEP", str(DEFAULT_SERVO_STEP)))
            except ValueError:
                self._step = DEFAULT_SERVO_STEP
        else:
            self._step = step

        self._mode = "mock"
        logger.info(
            f"[PanTilt] MockPanTiltController initialized (Initial Pan: {self._pan_angle}°, "
            f"Tilt: {self._tilt_angle}°, Step: {self._step}°)"
        )

    @property
    def pan_angle(self) -> int:
        with self._lock:
            return self._pan_angle

    @property
    def tilt_angle(self) -> int:
        with self._lock:
            return self._tilt_angle

    @property
    def step(self) -> int:
        return self._step

    def get_position(self) -> Dict[str, int]:
        with self._lock:
            return {"panAngle": self._pan_angle, "tiltAngle": self._tilt_angle}

    def get_status(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "success": True,
                "panAngle": self._pan_angle,
                "tiltAngle": self._tilt_angle,
                "step": self._step,
                "mode": self._mode,
                "connected": True,
            }

    def check_health(self) -> Dict[str, Any]:
        return {
            "success": True,
            "mode": self._mode,
            "connected": True,
        }

    def move_left(self) -> Dict[str, Any]:
        return self.execute_command("LEFT")

    def move_right(self) -> Dict[str, Any]:
        return self.execute_command("RIGHT")

    def move_up(self) -> Dict[str, Any]:
        return self.execute_command("UP")

    def move_down(self) -> Dict[str, Any]:
        return self.execute_command("DOWN")

    def center(self) -> Dict[str, Any]:
        return self.execute_command("CENTER")

    def stop(self) -> Dict[str, Any]:
        return self.execute_command("STOP")

    def execute_command(self, command: str) -> Dict[str, Any]:
        cmd = command.strip().upper()
        if cmd not in SUPPORTED_COMMANDS:
            raise ValueError(
                f"Invalid Pan/Tilt command '{command}'. Supported: {', '.join(sorted(SUPPORTED_COMMANDS))}"
            )

        with self._lock:
            old_pan = self._pan_angle
            old_tilt = self._tilt_angle

            if cmd == "LEFT":
                self._pan_angle = clamp_angle(self._pan_angle - self._step)
            elif cmd == "RIGHT":
                self._pan_angle = clamp_angle(self._pan_angle + self._step)
            elif cmd == "UP":
                self._tilt_angle = clamp_angle(self._tilt_angle + self._step)
            elif cmd == "DOWN":
                self._tilt_angle = clamp_angle(self._tilt_angle - self._step)
            elif cmd == "CENTER":
                self._pan_angle = DEFAULT_PAN_ANGLE
                self._tilt_angle = DEFAULT_TILT_ANGLE
            elif cmd == "STOP":
                # Current position remains unchanged
                pass

            curr_pan = self._pan_angle
            curr_tilt = self._tilt_angle

        # Clean structured logging as specified in requirement 13:
        # [PanTilt] Command: LEFT
        # [PanTilt] Position: Pan 90° → 85°, Tilt 90°
        # [PanTilt] Mode: mock
        logger.info(f"[PanTilt] Command: {cmd}")
        if cmd in ("LEFT", "RIGHT"):
            logger.info(f"[PanTilt] Position: Pan {old_pan}° → {curr_pan}°, Tilt {curr_tilt}°")
        elif cmd in ("UP", "DOWN"):
            logger.info(f"[PanTilt] Position: Pan {curr_pan}°, Tilt {old_tilt}° → {curr_tilt}°")
        elif cmd == "CENTER":
            logger.info(f"[PanTilt] Position: Centered (Pan {old_pan}° → 90°, Tilt {old_tilt}° → 90°)")
        else:
            logger.info(f"[PanTilt] Position: Pan {curr_pan}°, Tilt {curr_tilt}° (unchanged)")
        logger.info(f"[PanTilt] Mode: {self._mode}")

        return {
            "success": True,
            "command": cmd,
            "panAngle": curr_pan,
            "tiltAngle": curr_tilt,
            "mode": self._mode,
            "connected": True,
        }


# ── ESP32 Hardware Controller ─────────────────────────────────────────────────
class ESP32PanTiltController(PanTiltController):
    """Communicates with real ESP32 microcontrollers driving SG90 servos.

    Sends target angles or direction pulses via HTTP POST to the ESP32 endpoint.
    Handles network timeouts and connection errors gracefully.
    """

    def __init__(self, base_url: Optional[str] = None, step: Optional[int] = None):
        self._lock = threading.Lock()
        self._pan_angle = DEFAULT_PAN_ANGLE
        self._tilt_angle = DEFAULT_TILT_ANGLE

        if step is None:
            try:
                self._step = int(os.getenv("SERVO_STEP", str(DEFAULT_SERVO_STEP)))
            except ValueError:
                self._step = DEFAULT_SERVO_STEP
        else:
            self._step = step

        raw_url = base_url or os.getenv("ESP32_BASE_URL", "http://192.168.1.100")
        self._base_url = raw_url.rstrip("/")
        self._timeout = float(os.getenv("ESP32_TIMEOUT", "2.0"))
        self._mode = "esp32"
        self._connected = False
        self._last_error: Optional[str] = None

        logger.info(
            f"[PanTilt] ESP32PanTiltController initialized (Target: {self._base_url}, "
            f"Step: {self._step}°, Timeout: {self._timeout}s)"
        )

    @property
    def pan_angle(self) -> int:
        with self._lock:
            return self._pan_angle

    @property
    def tilt_angle(self) -> int:
        with self._lock:
            return self._tilt_angle

    @property
    def base_url(self) -> str:
        return self._base_url

    def get_position(self) -> Dict[str, int]:
        with self._lock:
            return {"panAngle": self._pan_angle, "tiltAngle": self._tilt_angle}

    def get_status(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "success": True,
                "panAngle": self._pan_angle,
                "tiltAngle": self._tilt_angle,
                "step": self._step,
                "mode": self._mode,
                "connected": self._connected,
                "baseUrl": self._base_url,
                "lastError": self._last_error,
            }

    def check_health(self) -> Dict[str, Any]:
        """Pings the ESP32 to verify reachability."""
        url = f"{self._base_url}/api/pan-tilt/status"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "FloodScout/2.0"}, method="GET")
            with urllib.request.urlopen(req, timeout=self._timeout) as resp:
                if resp.status == 200:
                    with self._lock:
                        self._connected = True
                        self._last_error = None
                    return {"success": True, "mode": self._mode, "connected": True}
        except Exception as e:
            with self._lock:
                self._connected = False
                self._last_error = str(e)
            logger.warning(f"[PanTilt] ERROR: ESP32 unavailable at {url}: {e}")

        return {
            "success": False,
            "mode": self._mode,
            "connected": False,
            "error": self._last_error,
        }

    def move_left(self) -> Dict[str, Any]:
        return self.execute_command("LEFT")

    def move_right(self) -> Dict[str, Any]:
        return self.execute_command("RIGHT")

    def move_up(self) -> Dict[str, Any]:
        return self.execute_command("UP")

    def move_down(self) -> Dict[str, Any]:
        return self.execute_command("DOWN")

    def center(self) -> Dict[str, Any]:
        return self.execute_command("CENTER")

    def stop(self) -> Dict[str, Any]:
        return self.execute_command("STOP")

    def execute_command(self, command: str) -> Dict[str, Any]:
        cmd = command.strip().upper()
        if cmd not in SUPPORTED_COMMANDS:
            raise ValueError(
                f"Invalid Pan/Tilt command '{command}'. Supported: {', '.join(sorted(SUPPORTED_COMMANDS))}"
            )

        with self._lock:
            old_pan = self._pan_angle
            old_tilt = self._tilt_angle

            if cmd == "LEFT":
                new_pan = clamp_angle(self._pan_angle - self._step)
                new_tilt = self._tilt_angle
            elif cmd == "RIGHT":
                new_pan = clamp_angle(self._pan_angle + self._step)
                new_tilt = self._tilt_angle
            elif cmd == "UP":
                new_pan = self._pan_angle
                new_tilt = clamp_angle(self._tilt_angle + self._step)
            elif cmd == "DOWN":
                new_pan = self._pan_angle
                new_tilt = clamp_angle(self._tilt_angle - self._step)
            elif cmd == "CENTER":
                new_pan = DEFAULT_PAN_ANGLE
                new_tilt = DEFAULT_TILT_ANGLE
            elif cmd == "STOP":
                new_pan = self._pan_angle
                new_tilt = self._tilt_angle

        logger.info(f"[PanTilt] Command: {cmd}")
        logger.info(f"[PanTilt] Position: Pan {old_pan}° → {new_pan}°, Tilt {old_tilt}° → {new_tilt}°")
        logger.info(f"[PanTilt] Mode: {self._mode}")

        esp_url = f"{self._base_url}/api/pan-tilt/{cmd.lower()}"
        req = urllib.request.Request(
            esp_url,
            headers={"User-Agent": "FloodScout/2.0"},
            method="GET",
        )

        try:
            with urllib.request.urlopen(req, timeout=self._timeout) as resp:
                resp_data = resp.read().decode("utf-8")
                with self._lock:
                    self._pan_angle = new_pan
                    self._tilt_angle = new_tilt
                    self._connected = True
                    self._last_error = None
                return {
                    "success": True,
                    "command": cmd,
                    "panAngle": new_pan,
                    "tiltAngle": new_tilt,
                    "mode": self._mode,
                    "connected": True,
                    "esp32Response": resp_data,
                }
        except urllib.error.URLError as e:
            err_msg = f"ESP32 connection failed: {e.reason if hasattr(e, 'reason') else e}"
            logger.error(f"[PanTilt] ERROR: ESP32 unavailable ({err_msg})")
            with self._lock:
                self._connected = False
                self._last_error = err_msg
            return {
                "success": False,
                "command": cmd,
                "panAngle": self._pan_angle,
                "tiltAngle": self._tilt_angle,
                "mode": self._mode,
                "connected": False,
                "error": err_msg,
            }
        except Exception as e:
            err_msg = str(e)
            logger.error(f"[PanTilt] ERROR: ESP32 unavailable ({err_msg})")
            with self._lock:
                self._connected = False
                self._last_error = err_msg
            return {
                "success": False,
                "command": cmd,
                "panAngle": self._pan_angle,
                "tiltAngle": self._tilt_angle,
                "mode": self._mode,
                "connected": False,
                "error": err_msg,
            }


# ── Serial Controller (USB COM port / CH340 / ESP32) ─────────────────────────
class SerialPanTiltController(PanTiltController):
    """Controls physical SG90 servos and PIZ Pan & Tilt Action Sonar via USB Serial.

    Sends text and angle commands (e.g., 'LEFT\n', 'P:85,T:90\n') directly to
    the microcontroller (ESP32 / Arduino / CH340) over USB.
    """

    def __init__(self, port: Optional[str] = None, baud_rate: int = 115200, step: Optional[int] = None):
        self._lock = threading.Lock()
        self._pan_angle = DEFAULT_PAN_ANGLE
        self._tilt_angle = DEFAULT_TILT_ANGLE
        self._configured_port = port or os.getenv("PAN_TILT_SERIAL_PORT", "COM5")
        self._baud_rate = int(os.getenv("PAN_TILT_SERIAL_BAUD", str(baud_rate)))
        self._active_port: Optional[str] = None
        self._serial: Optional[Any] = None
        self._connected = False
        self._last_error: Optional[str] = None
        self._mode = "serial"

        if step is None:
            try:
                self._step = int(os.getenv("SERVO_STEP", str(DEFAULT_SERVO_STEP)))
            except ValueError:
                self._step = DEFAULT_SERVO_STEP
        else:
            self._step = step

        logger.info(
            f"[PanTilt] SerialPanTiltController initialized (Port: {self._configured_port}, "
            f"Baud: {self._baud_rate}, Step: {self._step}°)"
        )
        self._connect()

    def _find_port(self) -> Optional[str]:
        if not serial:
            return None
        try:
            ports = list(serial.tools.list_ports.comports())
            for p in ports:
                if self._configured_port and p.device.upper() == self._configured_port.upper():
                    return p.device
            for p in ports:
                desc = (p.description or "").lower()
                if "ch340" in desc or "cp210" in desc or "esp32" in desc or "usb-serial" in desc:
                    return p.device
            if ports:
                return ports[0].device
        except Exception:
            pass
        return self._configured_port

    def _connect(self) -> bool:
        if not serial:
            self._last_error = "pyserial library is not installed"
            self._connected = False
            return False
        with self._lock:
            if self._serial and self._serial.is_open:
                self._connected = True
                return True
            target_port = self._find_port()
            if not target_port:
                self._last_error = f"Serial port '{self._configured_port}' not found"
                self._connected = False
                return False
            try:
                self._serial = serial.Serial(
                    port=target_port,
                    baudrate=self._baud_rate,
                    timeout=0.5,
                    write_timeout=0.5,
                )
                self._active_port = target_port
                self._connected = True
                self._last_error = None
                logger.info(f"[PanTilt] Connected to serial controller on {target_port} at {self._baud_rate} baud")
                return True
            except Exception as e:
                self._serial = None
                self._active_port = None
                self._connected = False
                self._last_error = str(e)
                logger.warning(f"[PanTilt] Could not open serial port {target_port}: {e}")
                return False

    def _send_command(self, cmd: str) -> bool:
        if not self._serial or not self._serial.is_open:
            if not self._connect():
                return False
        try:
            line = f"{cmd.upper()}\n"
            self._serial.write(line.encode("utf-8"))
            self._serial.flush()
            return True
        except Exception as e:
            self._last_error = str(e)
            self._connected = False
            try:
                if self._serial:
                    self._serial.close()
            except Exception:
                pass
            self._serial = None
            return False

    @property
    def pan_angle(self) -> int:
        with self._lock:
            return self._pan_angle

    @property
    def tilt_angle(self) -> int:
        with self._lock:
            return self._tilt_angle

    def get_position(self) -> Dict[str, int]:
        with self._lock:
            return {"panAngle": self._pan_angle, "tiltAngle": self._tilt_angle}

    def get_status(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "success": True,
                "panAngle": self._pan_angle,
                "tiltAngle": self._tilt_angle,
                "step": self._step,
                "mode": self._mode,
                "connected": self._connected,
                "port": self._active_port or self._configured_port,
                "last_error": self._last_error,
            }

    def check_health(self) -> Dict[str, Any]:
        connected = self._connect()
        return {
            "success": connected,
            "status": "ok" if connected else "error",
            "mode": self._mode,
            "connected": connected,
            "port": self._active_port or self._configured_port,
            "error": self._last_error,
        }

    def move_left(self) -> Dict[str, Any]:
        with self._lock:
            old_p = self._pan_angle
            self._pan_angle = clamp_angle(self._pan_angle - self._step)
            logger.info(f"[PanTilt] Command: LEFT | Pan {old_p}° → {self._pan_angle}°, Tilt {self._tilt_angle}°")
            sent = self._send_command("LEFT")
            return self._format_result("LEFT", sent)

    def move_right(self) -> Dict[str, Any]:
        with self._lock:
            old_p = self._pan_angle
            self._pan_angle = clamp_angle(self._pan_angle + self._step)
            logger.info(f"[PanTilt] Command: RIGHT | Pan {old_p}° → {self._pan_angle}°, Tilt {self._tilt_angle}°")
            sent = self._send_command("RIGHT")
            return self._format_result("RIGHT", sent)

    def move_up(self) -> Dict[str, Any]:
        with self._lock:
            old_t = self._tilt_angle
            self._tilt_angle = clamp_angle(self._tilt_angle + self._step)
            logger.info(f"[PanTilt] Command: UP | Pan {self._pan_angle}°, Tilt {old_t}° → {self._tilt_angle}°")
            sent = self._send_command("UP")
            return self._format_result("UP", sent)

    def move_down(self) -> Dict[str, Any]:
        with self._lock:
            old_t = self._tilt_angle
            self._tilt_angle = clamp_angle(self._tilt_angle - self._step)
            logger.info(f"[PanTilt] Command: DOWN | Pan {self._pan_angle}°, Tilt {old_t}° → {self._tilt_angle}°")
            sent = self._send_command("DOWN")
            return self._format_result("DOWN", sent)

    def center(self) -> Dict[str, Any]:
        with self._lock:
            self._pan_angle = DEFAULT_PAN_ANGLE
            self._tilt_angle = DEFAULT_TILT_ANGLE
            logger.info("[PanTilt] Command: CENTER | Pan 90°, Tilt 90°")
            sent = self._send_command("CENTER")
            return self._format_result("CENTER", sent)

    def stop(self) -> Dict[str, Any]:
        with self._lock:
            logger.info(f"[PanTilt] Command: STOP | Pan {self._pan_angle}°, Tilt {self._tilt_angle}° (unchanged)")
            sent = self._send_command("STOP")
            return self._format_result("STOP", sent)

    def _format_result(self, cmd: str, sent: bool) -> Dict[str, Any]:
        return {
            "success": sent,
            "command": cmd,
            "panAngle": self._pan_angle,
            "tiltAngle": self._tilt_angle,
            "mode": self._mode,
            "connected": self._connected,
            "port": self._active_port or self._configured_port,
            "error": self._last_error if not sent else None,
        }

    def execute_command(self, command: str) -> Dict[str, Any]:
        cmd = command.strip().upper()
        if cmd == "LEFT":
            return self.move_left()
        elif cmd == "RIGHT":
            return self.move_right()
        elif cmd == "UP":
            return self.move_up()
        elif cmd == "DOWN":
            return self.move_down()
        elif cmd == "CENTER":
            return self.center()
        elif cmd == "STOP":
            return self.stop()
        else:
            raise ValueError(
                f"Invalid command '{command}'. Supported: {', '.join(sorted(SUPPORTED_COMMANDS))}"
            )


# ── Factory function ──────────────────────────────────────────────────────────
_pan_tilt_instance: Optional[PanTiltController] = None


def get_pan_tilt_controller() -> PanTiltController:
    """Returns the configured PanTiltController implementation (Singleton).

    Reads PAN_TILT_MODE from environment:
      - 'serial' / 'usb': SerialPanTiltController (COM port e.g. COM5)
      - 'esp32' / 'wifi': ESP32PanTiltController (HTTP client)
      - 'mock' (default): MockPanTiltController (Software simulation)
    """
    global _pan_tilt_instance
    if _pan_tilt_instance is not None:
        return _pan_tilt_instance

    mode = os.getenv("PAN_TILT_MODE", "mock").strip().lower()
    if mode in ("serial", "usb"):
        logger.info("[PanTilt] Factory creating SerialPanTiltController")
        _pan_tilt_instance = SerialPanTiltController()
    elif mode in ("esp32", "wifi", "http"):
        logger.info("[PanTilt] Factory creating ESP32PanTiltController")
        _pan_tilt_instance = ESP32PanTiltController()
    else:
        logger.info("[PanTilt] Factory creating MockPanTiltController")
        _pan_tilt_instance = MockPanTiltController()
    return _pan_tilt_instance
