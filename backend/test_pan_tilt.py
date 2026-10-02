"""
test_pan_tilt.py — Unit test suite for FloodScout Pan/Tilt Hardware Abstraction Layer.

Covers all test criteria specified in requirement 18:
  - LEFT: 90 → 85
  - RIGHT: 90 → 95
  - UP: 90 → 95
  - DOWN: 90 → 85
  - CENTER: any position → 90 / 90
  - STOP: position unchanged
  - Boundary: 0 + LEFT → 0
  - Boundary: 180 + RIGHT → 180
  - Boundary: 0 + DOWN → 0
  - Boundary: 180 + UP → 180
  - Invalid command → error
  - Case insensitivity ('left', 'UP', 'cEnTeR')
  - Mock vs ESP32 fallback behavior
"""

import unittest
from pan_tilt import (
    MockPanTiltController,
    ESP32PanTiltController,
    clamp_angle,
    SUPPORTED_COMMANDS,
)


class TestMockPanTiltController(unittest.TestCase):
    def setUp(self):
        self.controller = MockPanTiltController(step=5)

    def test_initial_position(self):
        """Initial neutral orientation must be exactly pan 90° and tilt 90°."""
        pos = self.controller.get_position()
        self.assertEqual(pos["panAngle"], 90)
        self.assertEqual(pos["tiltAngle"], 90)
        status = self.controller.get_status()
        self.assertEqual(status["mode"], "mock")
        self.assertTrue(status["connected"])

    def test_move_left(self):
        """LEFT: 90° → 85°"""
        res = self.controller.execute_command("LEFT")
        self.assertTrue(res["success"])
        self.assertEqual(res["panAngle"], 85)
        self.assertEqual(res["tiltAngle"], 90)

    def test_move_right(self):
        """RIGHT: 90° → 95°"""
        res = self.controller.execute_command("RIGHT")
        self.assertTrue(res["success"])
        self.assertEqual(res["panAngle"], 95)
        self.assertEqual(res["tiltAngle"], 90)

    def test_move_up(self):
        """UP: 90° → 95°"""
        res = self.controller.execute_command("UP")
        self.assertTrue(res["success"])
        self.assertEqual(res["panAngle"], 90)
        self.assertEqual(res["tiltAngle"], 95)

    def test_move_down(self):
        """DOWN: 90° → 85°"""
        res = self.controller.execute_command("DOWN")
        self.assertTrue(res["success"])
        self.assertEqual(res["panAngle"], 90)
        self.assertEqual(res["tiltAngle"], 85)

    def test_center_from_arbitrary_position(self):
        """CENTER: any position → 90° / 90°"""
        # Move to some arbitrary position
        self.controller.execute_command("LEFT")
        self.controller.execute_command("LEFT")
        self.controller.execute_command("DOWN")
        self.assertEqual(self.controller.pan_angle, 80)
        self.assertEqual(self.controller.tilt_angle, 85)

        # Center
        res = self.controller.execute_command("CENTER")
        self.assertTrue(res["success"])
        self.assertEqual(res["panAngle"], 90)
        self.assertEqual(res["tiltAngle"], 90)

    def test_stop_maintains_position(self):
        """STOP: position unchanged."""
        self.controller.execute_command("RIGHT")
        self.controller.execute_command("UP")
        pan_before = self.controller.pan_angle
        tilt_before = self.controller.tilt_angle

        res = self.controller.execute_command("STOP")
        self.assertTrue(res["success"])
        self.assertEqual(res["panAngle"], pan_before)
        self.assertEqual(res["tiltAngle"], tilt_before)

    def test_boundary_left_clamp(self):
        """Boundary: 0 + LEFT → 0 (never negative)."""
        # Move pan to 0
        for _ in range(25):
            self.controller.execute_command("LEFT")
        self.assertEqual(self.controller.pan_angle, 0)

        # Press LEFT again
        res = self.controller.execute_command("LEFT")
        self.assertTrue(res["success"])
        self.assertEqual(res["panAngle"], 0)

    def test_boundary_right_clamp(self):
        """Boundary: 180 + RIGHT → 180 (never over 180°)."""
        for _ in range(25):
            self.controller.execute_command("RIGHT")
        self.assertEqual(self.controller.pan_angle, 180)

        res = self.controller.execute_command("RIGHT")
        self.assertTrue(res["success"])
        self.assertEqual(res["panAngle"], 180)

    def test_boundary_down_clamp(self):
        """Boundary: 0 + DOWN → 0."""
        for _ in range(25):
            self.controller.execute_command("DOWN")
        self.assertEqual(self.controller.tilt_angle, 0)

        res = self.controller.execute_command("DOWN")
        self.assertTrue(res["success"])
        self.assertEqual(res["tiltAngle"], 0)

    def test_boundary_up_clamp(self):
        """Boundary: 180 + UP → 180."""
        for _ in range(25):
            self.controller.execute_command("UP")
        self.assertEqual(self.controller.tilt_angle, 180)

        res = self.controller.execute_command("UP")
        self.assertTrue(res["success"])
        self.assertEqual(res["tiltAngle"], 180)

    def test_invalid_command_raises(self):
        """Invalid command must raise ValueError."""
        with self.assertRaises(ValueError):
            self.controller.execute_command("ROTATE_360")

        with self.assertRaises(ValueError):
            self.controller.execute_command("JUMP")

    def test_case_insensitivity(self):
        """Commands should be accepted regardless of casing ('left', 'Right')."""
        res1 = self.controller.execute_command("left")
        self.assertEqual(res1["command"], "LEFT")
        self.assertEqual(res1["panAngle"], 85)

        res2 = self.controller.execute_command("Up")
        self.assertEqual(res2["command"], "UP")
        self.assertEqual(res2["tiltAngle"], 95)

    def test_health_check(self):
        """Health check returns connected=True in mock mode."""
        health = self.controller.check_health()
        self.assertTrue(health["success"])
        self.assertEqual(health["mode"], "mock")
        self.assertTrue(health["connected"])

    def test_clamp_helper(self):
        """Direct tests for clamp_angle helper."""
        self.assertEqual(clamp_angle(-10), 0)
        self.assertEqual(clamp_angle(0), 0)
        self.assertEqual(clamp_angle(90), 90)
        self.assertEqual(clamp_angle(180), 180)
        self.assertEqual(clamp_angle(250), 180)


class TestESP32PanTiltController(unittest.TestCase):
    def test_offline_esp32_graceful_handling(self):
        """ESP32 controller must not crash if ESP32 IP is unreachable."""
        # Point to unreachable local IP
        controller = ESP32PanTiltController(base_url="http://127.0.0.1:59999", step=5)
        # Health check should return connected=False without raising an unhandled exception
        health = controller.check_health()
        self.assertFalse(health["connected"])
        self.assertEqual(health["mode"], "esp32")

        # Command execution should return success=False gracefully
        res = controller.execute_command("LEFT")
        self.assertFalse(res["success"])
        self.assertFalse(res["connected"])
        self.assertEqual(res["mode"], "esp32")

class TestPanTiltApiEndpoints(unittest.TestCase):
    """Integration test suite for FastAPI /api/pan-tilt endpoints."""

    @classmethod
    def setUpClass(cls):
        from fastapi.testclient import TestClient
        from main import app, state
        from pan_tilt import MockPanTiltController
        state.pan_tilt_controller = MockPanTiltController()
        cls.client = TestClient(app)

    def setUp(self):
        # Reset to center before each test
        self.client.post("/api/pan-tilt/command", json={"command": "CENTER"})

    def test_api_status(self):
        res = self.client.get("/api/pan-tilt/status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["panAngle"], 90)
        self.assertEqual(data["tiltAngle"], 90)
        self.assertEqual(data["mode"], "mock")
        self.assertTrue(data["connected"])

    def test_api_health(self):
        res = self.client.get("/api/pan-tilt/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["mode"], "mock")

    def test_api_command_left(self):
        res = self.client.post("/api/pan-tilt/command", json={"command": "LEFT"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["command"], "LEFT")
        self.assertEqual(data["panAngle"], 85)
        self.assertEqual(data["tiltAngle"], 90)

    def test_api_command_up(self):
        res = self.client.post("/api/pan-tilt/command", json={"command": "UP"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["command"], "UP")
        self.assertEqual(data["panAngle"], 90)
        self.assertEqual(data["tiltAngle"], 95)

    def test_api_command_center(self):
        self.client.post("/api/pan-tilt/command", json={"command": "LEFT"})
        self.client.post("/api/pan-tilt/command", json={"command": "DOWN"})
        res = self.client.post("/api/pan-tilt/command", json={"command": "CENTER"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["panAngle"], 90)
        self.assertEqual(data["tiltAngle"], 90)

    def test_api_command_stop(self):
        self.client.post("/api/pan-tilt/command", json={"command": "RIGHT"})
        res = self.client.post("/api/pan-tilt/command", json={"command": "STOP"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["panAngle"], 95)
        self.assertEqual(data["tiltAngle"], 90)

    def test_api_invalid_command_returns_400(self):
        res = self.client.post("/api/pan-tilt/command", json={"command": "SPIN"})
        self.assertEqual(res.status_code, 400)
        data = res.json()
        self.assertIn("Invalid command", data["detail"])


if __name__ == "__main__":
    unittest.main()
