"""
gps_reader.py — Hardware Serial GPS Reader for FloodScout Robot.

Parses live GPS telemetry from Seeed Studio XIAO / ESP32 running TinyGPSPlus
connected to GY-NEO8M / NEO-6M / NEO-M8N GNSS module over USB Serial.

Expected Serial Output from ESP32 at 115200 baud:
    Latitude:  1.864234
    Longitude: 103.114237
    Satellites: 8
    Altitude:   18.00 m
    ------------------------------------
"""

import os
import re
import time
import math
import logging
import threading
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple, List

try:
    import serial
    import serial.tools.list_ports
except ImportError:
    serial = None

logger = logging.getLogger("floodscout-gps")

# Regex patterns matching TinyGPS++ serial format and combined ESP32 debug format
# Examples:
#   [Distance] 45.2 cm | [GPS Satellites] 8 | Lat: 1.864234 Lng: 103.114237 | Alt: 18.0 m
#   Latitude:  1.864234
#   Longitude: 103.114237
LAT_REGEX = re.compile(r"(?:Latitude|Lat):\s*([+-]?\d+(?:\.\d+)?)", re.IGNORECASE)
LNG_REGEX = re.compile(r"(?:Longitude|Lng):\s*([+-]?\d+(?:\.\d+)?)", re.IGNORECASE)
SAT_REGEX = re.compile(r"(?:\[GPS Satellites\]|Satellites:?)\s*(\d+)", re.IGNORECASE)
ALT_REGEX = re.compile(r"(?:Altitude|Alt):\s*([+-]?\d+(?:\.\d+)?)\s*m?", re.IGNORECASE)
DIST_REGEX = re.compile(r"\[Distance\]\s*([+-]?\d+(?:\.\d+)?)\s*cm", re.IGNORECASE)


def haversine_distance_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Distance in meters between two lat/lng pairs."""
    r = 6371000.0  # Earth radius in meters
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (math.sin(d_lat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lng / 2.0) ** 2)
    return 2.0 * r * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


def calculate_bearing_deg(lat1: float, lng1: float, lat2: float, lng2: float) -> int:
    """Bearing in degrees (0-360) from point 1 to point 2."""
    r_lat1 = math.radians(lat1)
    r_lat2 = math.radians(lat2)
    d_lng = math.radians(lng2 - lng1)
    y = math.sin(d_lng) * math.cos(r_lat2)
    x = math.cos(r_lat1) * math.sin(r_lat2) - math.sin(r_lat1) * math.cos(r_lat2) * math.cos(d_lng)
    b = math.degrees(math.atan2(y, x))
    return int((b + 360.0) % 360.0)


class GpsSerialReader:
    """Background serial thread reading NEO-8M GPS sentences from ESP32."""

    def __init__(self, port: Optional[str] = None, baud_rate: int = 115200):
        self.configured_port = port or os.getenv("GPS_SERIAL_PORT", "COM5")
        self.baud_rate = int(os.getenv("GPS_SERIAL_BAUD", str(baud_rate)))
        self.active_port: Optional[str] = None
        self._serial: Optional[Any] = None
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()

        # Telemetry State
        self.connected = False
        self.is_valid = False
        self.latitude: Optional[float] = None
        self.longitude: Optional[float] = None
        self.satellites: int = 0
        self.altitude: float = 0.0
        self.speed_kmh: float = 0.0
        self.heading: int = 0
        self.last_update_time: Optional[float] = None
        self.last_status_message: str = "Initializing GPS receiver..."
        self.history: List[Dict[str, Any]] = []

        # Temporary buffer for parsing incoming line pairs
        self._pending_lat: Optional[float] = None
        self._pending_lng: Optional[float] = None
        self._pending_sat: Optional[int] = None
        self._pending_alt: Optional[float] = None

        # Listeners for real-time WebSocket push & distance integration
        self._subscribers: List[Any] = []
        self.distance_callback: Optional[Any] = None

    def find_gps_port(self) -> Optional[str]:
        """Detect available COM port for GPS receiver."""
        if not serial:
            return None

        ports = list(serial.tools.list_ports.comports())
        if not ports:
            return None

        # 1. Match configured port first
        for p in ports:
            if self.configured_port and p.device.upper() == self.configured_port.upper():
                return p.device

        # 2. Look for CH340, CP210, FTDI, or USB-Serial chips common on ESP32/Arduino
        for p in ports:
            desc = (p.description or "").lower()
            if "ch340" in desc or "usb-serial" in desc or "cp210" in desc or "ftdi" in desc:
                return p.device

        # 3. Default to first port
        return ports[0].device

    def start(self):
        """Start the GPS background reader thread."""
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._read_loop, name="gps-serial-reader", daemon=True)
        self._thread.start()
        logger.info("GPS serial background thread started.")

    def stop(self):
        """Stop reader thread and close serial connection."""
        self._running = False
        if self._serial and self._serial.is_open:
            try:
                self._serial.close()
            except Exception:
                pass
        self.connected = False
        logger.info("GPS serial reader stopped.")

    def _read_loop(self):
        """Continuously reconnect and read lines from the GPS serial stream."""
        while self._running:
            if not self.connected or not self._serial or not self._serial.is_open:
                port = self.find_gps_port()
                if not port:
                    self.last_status_message = "No serial port found. Re-scanning..."
                    time.sleep(2.0)
                    continue

                try:
                    logger.info(f"Opening GPS serial port {port} at {self.baud_rate} baud...")
                    self._serial = serial.Serial(
                        port=port,
                        baudrate=self.baud_rate,
                        timeout=1.0,
                    )
                    self.active_port = port
                    self.connected = True
                    self.last_status_message = f"Connected to {port} at {self.baud_rate} baud. Waiting for GPS fix..."
                    logger.info(f"Successfully connected to GPS on {port}")
                except Exception as e:
                    self.connected = False
                    self.active_port = None
                    self.last_status_message = f"Port error on {port}: {e}"
                    logger.warning(f"Could not open GPS serial port {port}: {e}")
                    time.sleep(2.5)
                    continue

            try:
                raw_line = self._serial.readline()
                if not raw_line:
                    continue

                line = raw_line.decode("utf-8", errors="ignore").strip()
                if not line:
                    continue

                self._process_line(line)
            except Exception as e:
                logger.warning(f"Error reading from GPS serial {self.active_port}: {e}")
                self.connected = False
                if self._serial:
                    try:
                        self._serial.close()
                    except Exception:
                        pass
                self._serial = None
                time.sleep(1.5)

    def _process_line(self, line: str):
        """Parse incoming line and trigger update when full fix is assembled."""
        # 1. Check Distance from Ultrasonic Sensor
        dist_match = DIST_REGEX.search(line)
        if dist_match:
            try:
                dist_val = float(dist_match.group(1))
                if self.distance_callback:
                    self.distance_callback(dist_val)
            except ValueError:
                pass
        elif "[Distance] Clear" in line or "[Distance] clear" in line:
            if self.distance_callback:
                self.distance_callback(400.0)

        # 2. Check Satellites
        sat_match = SAT_REGEX.search(line)
        if sat_match:
            try:
                val = int(sat_match.group(1))
                self._pending_sat = val
                with self._lock:
                    self.satellites = val
                    if val == 0:
                        self.last_status_message = "Searching for satellites (Antenna outdoors required)..."
                    elif not self.is_valid:
                        self.last_status_message = f"Acquiring lock ({val} satellites visible, awaiting 3D fix)..."
            except ValueError:
                pass

        # 3. Check Latitude
        lat_match = LAT_REGEX.search(line)
        if lat_match:
            try:
                val = float(lat_match.group(1))
                if abs(val) > 0.0001:
                    self._pending_lat = val
            except ValueError:
                pass

        # 4. Check Longitude
        lng_match = LNG_REGEX.search(line)
        if lng_match:
            try:
                val = float(lng_match.group(1))
                if abs(val) > 0.0001:
                    self._pending_lng = val
            except ValueError:
                pass

        # 5. Check Altitude
        alt_match = ALT_REGEX.search(line)
        if alt_match:
            try:
                self._pending_alt = float(alt_match.group(1))
            except ValueError:
                pass

        # When lat and lng are both gathered, commit fix immediately!
        if self._pending_lat is not None and self._pending_lng is not None:
            self._commit_fix(
                lat=self._pending_lat,
                lng=self._pending_lng,
                sats=self._pending_sat if self._pending_sat is not None else self.satellites,
                alt=self._pending_alt if self._pending_alt is not None else self.altitude
            )
            self._pending_lat = None
            self._pending_lng = None
            self._pending_sat = None
            self._pending_alt = None

    def update_from_wifi(self, gps_data: Dict[str, Any], distance_cm: Optional[float] = None):
        """Update telemetry from ESP32 /api/sensors HTTP response."""
        now = time.time()
        self.connected = True
        self.last_update_time = now

        if distance_cm is not None and self.distance_callback:
            self.distance_callback(distance_cm)

        if not isinstance(gps_data, dict):
            return

        fix = bool(gps_data.get("fix", False))
        lat = gps_data.get("lat")
        lng = gps_data.get("lng")
        sats = int(gps_data.get("satellites", 0))
        alt = float(gps_data.get("altitude_m", 0.0))

        with self._lock:
            self.satellites = sats
            self.altitude = alt

            has_valid_coords = (
                fix and lat is not None and lng is not None
                and (abs(lat) > 0.001 or abs(lng) > 0.001)
            )

            if has_valid_coords:
                self._commit_fix(lat, lng, sats, alt)
            else:
                self.is_valid = False
                if sats > 0:
                    self.last_status_message = f"Acquiring satellite lock ({sats} satellites visible, awaiting 3D fix)..."
                else:
                    self.last_status_message = "Searching for satellites (Antenna outdoors required)..."

    def _commit_fix(self, lat: float, lng: float, sats: int, alt: float):
        """Record valid GPS fix and notify subscribers."""
        now = time.time()
        with self._lock:
            # Calculate speed and heading if previous location exists
            if self.latitude is not None and self.longitude is not None and self.last_update_time:
                dt = now - self.last_update_time
                if 0.2 < dt < 10.0:
                    dist_m = haversine_distance_m(self.latitude, self.longitude, lat, lng)
                    if dist_m > 0.4:
                        calc_speed_kmh = (dist_m / dt) * 3.6
                        self.speed_kmh = round(min(60.0, calc_speed_kmh), 1)
                        self.heading = calculate_bearing_deg(self.latitude, self.longitude, lat, lng)

            self.latitude = lat
            self.longitude = lng
            self.satellites = sats
            self.altitude = alt
            self.is_valid = True
            self.last_update_time = now
            self.last_status_message = f"Live 3D Fix ({sats} Sats) • Altitude {alt:.1f}m"

            record = {
                "latitude": lat,
                "longitude": lng,
                "satellites": sats,
                "altitude": alt,
                "speed_kmh": self.speed_kmh,
                "heading": self.heading,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            self.history.append(record)
            if len(self.history) > 200:
                self.history = self.history[-200:]

        logger.debug(f"[GPS FIX] Lat: {lat:.6f}, Lng: {lng:.6f}, Sats: {sats}, Alt: {alt}m")
        self._notify_subscribers(record)

    def subscribe(self, callback):
        """Register a callback for new GPS fixes."""
        self._subscribers.append(callback)

    def unsubscribe(self, callback):
        if callback in self._subscribers:
            self._subscribers.remove(callback)

    def _notify_subscribers(self, record: Dict[str, Any]):
        for cb in list(self._subscribers):
            try:
                cb(record)
            except Exception as e:
                logger.error(f"Error in GPS subscriber callback: {e}")

    def get_status(self) -> Dict[str, Any]:
        """Return current GPS telemetry snapshot."""
        with self._lock:
            now = time.time()
            age_sec = (now - self.last_update_time) if self.last_update_time else None
            is_stale = age_sec is not None and age_sec > 10.0

            return {
                "connected": self.connected,
                "port": self.active_port or self.configured_port,
                "baud_rate": self.baud_rate,
                "is_valid": self.is_valid and not is_stale,
                "latitude": self.latitude,
                "longitude": self.longitude,
                "satellites": self.satellites,
                "altitude": self.altitude,
                "speed_kmh": self.speed_kmh,
                "heading": self.heading,
                "status_message": self.last_status_message,
                "last_update_age_sec": round(age_sec, 1) if age_sec is not None else None,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "history_count": len(self.history),
            }


# Global singleton instance
_gps_reader_instance: Optional[GpsSerialReader] = None


def get_gps_reader() -> GpsSerialReader:
    """Retrieve or initialize singleton GpsSerialReader."""
    global _gps_reader_instance
    if _gps_reader_instance is None:
        _gps_reader_instance = GpsSerialReader()
        _gps_reader_instance.start()
    return _gps_reader_instance
