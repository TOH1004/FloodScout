# FloodScout — AI-Assisted Flood Search & Rescue System

FloodScout is an AI-assisted search-and-rescue platform designed to aid first responders during flood disaster operations. The system pairs real-time optical/thermal surveillance with **OpenCV HOG + SVM** person detection, tracking survivor count, detection scores, sonar bathymetry, and mission logging in a centralized mission command dashboard.

```
                    SYSTEM ARCHITECTURE
┌─────────────────────────────────────────────────────────────┐
│ USB Camera (Index 0 / 1 / 2)                                │
│       ↓                                                     │
│ OpenCV VideoCapture (camera.py — CameraSource ABC)          │
│       ↓                                                     │
│ OpenCV HOG + SVM (detector.py — Built-in People Detector)   │
│       ↓                                                     │
│ FastAPI Server (main.py — Port 8000)                        │
│   ├── GET  /health                                          │
│   ├── GET  /camera/status                                   │
│   ├── GET  /detection/status                                │
│   ├── GET  /detection/history                               │
│   ├── POST /detection/threshold                             │
│   └── GET  /video_feed (MJPEG Stream with bounding boxes)   │
│       ↓ HTTP / Polling (CORS enabled)                       │
│ FloodScout Web Dashboard (React + Vite + Tailwind CSS)      │
│   ├── Live HOG+SVM video feed with tactical HUD reticle     │
│   ├── Camera Connection status (Connected / Disconnected)   │
│   ├── Real-time Person Count & Detection Score metrics      │
│   ├── 🚨 High-visibility Debounced Detection Alert         │
│   ├── Detection History Log (auto-scrolling feed)           │
│   └── Architecture-ready ESP32-CAM brightness controls      │
└─────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

Before running the application, make sure you have **Python** and **Node.js** installed on your computer.

### 1. Install Python (if not installed)
Open Windows PowerShell and run:
```powershell
winget install Python.Python.3.11
```
*(Or download the installer from [python.org](https://www.python.org/downloads/). Ensure you check **"Add python.exe to PATH"** during setup).*

Verify installation:
```powershell
python --version
pip --version
```

### 2. Install Node.js (if not installed)
Open Windows PowerShell and run:
```powershell
winget install OpenJS.NodeJS.LTS
```
*(Or download from [nodejs.org](https://nodejs.org/)).*

Verify installation:
```powershell
node --version
npm --version
```

---

## Installation & Setup

### Step 1: Set up the Python Backend

Open **Terminal 1**:

```powershell
cd backend

# (Optional but recommended) Create a virtual environment:
python -m venv venv
venv\Scripts\activate

# Install Python requirements
pip install -r requirements.txt
```

#### OpenCV Version Requirement
FloodScout uses OpenCV's built-in `cv2.HOGDescriptor` with the default pre-trained SVM people detector (`cv2.HOGDescriptor_getDefaultPeopleDetector()`). Note that `opencv-python>=4.8,<5` is required as OpenCV 5 preview builds removed `HOGDescriptor` from the public API.

---

### Step 2: Test & Find Your USB Camera Index

Before starting the backend, verify which camera index your USB camera is assigned to on Windows:

```powershell
cd backend
python test_camera.py
```

Sample output:
```text
Testing Camera Index [0]... CONNECTED! (Resolution: 640x480)
  -> Recommended: Set CAMERA_INDEX=0 in backend/.env
Testing Camera Index [1]... Unavailable
Testing Camera Index [2]... Unavailable
```

If your camera is index `1` instead of `0`, simply edit `backend/.env`:
```env
CAMERA_INDEX=1
```

---

### Step 3: Start the Python Backend

In **Terminal 1**:

```powershell
cd backend
python main.py
```

The backend server starts on:
```text
http://localhost:8000
```
- Interactive API Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`
- Video Stream: `http://localhost:8000/video_feed`

---

### Step 4: Start the FloodScout Website

Open **Terminal 2** (in the project root directory):

```powershell
# Install frontend dependencies
npm install

# Start development server
npm run dev
```

Open your browser at the Vite URL (typically `http://localhost:5173` or `http://localhost:3000`).

Click on **"Operations Command & Control"** or navigate directly to:
```text
http://localhost:5173/dashboard
```

---

## Configuration Reference

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `CAMERA_INDEX` | `0` | OpenCV index of the USB webcam (change to `1` or `2` if needed) |
| `HOG_DETECTION_THRESHOLD` | `0.0` | SVM hit threshold margin (typical range: 0.0 to 1.5; 0.0 = default sensitivity) |
| `ALERT_COOLDOWN` | `3.0` | Debounce duration in seconds between consecutive alert triggers |
| `BACKEND_PORT` | `8000` | HTTP port for the FastAPI server |
| `XIAO_SERIAL_PORT` | `COM4` | USB Serial port for Seeed Studio XIAO ESP32-S3 Sense camera controls |
| `XIAO_SERIAL_BAUD` | `115200` | Baud rate for XIAO USB Serial command interface |

### Frontend (`.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | Base URL of the Python FastAPI backend service |

---

## Verifying Features & Testing

### 1. Test Camera Connection
- When the backend is running and the camera is plugged in:
  - Header displays: `● AI VISION: ACTIVE`
  - Camera viewport displays: `● Camera Connected (USB #0)`
  - Live video stream with crosshair reticle is rendered.
- If you unplug the USB camera:
  - Dashboard updates to: `● Camera Disconnected` / `Camera Unavailable` without crashing.
  - Video viewport shows a formatted test pattern card.

### 2. Test Person Detection
- **No Person in View:**
  - Status reads: `● No person detected`
  - Person Count: `0`, Detection Score: `0.0`
  - History logs: `Zone clear — No person`
- **One Person in View:**
  - HOG+SVM renders an emerald-green bounding box labeled `PERSON [score]` around the subject.
  - Alert banner lights up: `🚨 PERSON DETECTED — Count: 1, Score: [score]`
  - Header updates to reflect active target.
- **Multiple People in View:**
  - Person count accurately increments (`People: 2+`).
  - Highest detection score is surfaced.
- **Adjust Sensitivity:**
  - In the **Controls** panel (`Controls`), use the **AI Detection Sensitivity** slider to adjust the HOG detection threshold live.

### 3. Remote Camera Controls (Seeed XIAO ESP32-S3 Sense via USB)
- **Arduino Firmware:**
  - Flash or include the command handler from [firmware/xiao_camera_serial/xiao_camera_serial.ino](file:///c:/Users/tstho/Downloads/UTM/Y2S2/FloodScout/firmware/xiao_camera_serial/xiao_camera_serial.ino) into your XIAO sketch.
  - Call `processSerialCommands()` inside your `loop()`.
  - **Important:** Close the Arduino IDE Serial Monitor before starting the FloodScout backend so the backend can acquire COM4.
- **In FloodScout Dashboard:**
  - Open the **Controls** panel.
  - Check the **Camera Remote Controls** section:
    - **Status:** Shows `● Connected (COM4)` when connected.
    - **Brightness:** Slider from -2 to +2 (debounced).
    - **Contrast:** Slider from -2 to +2 (debounced).
    - **Saturation:** Slider from -2 to +2 (debounced).
    - **Horizontal Flip / Vertical Flip:** Toggle `[ ON ]` / `[ OFF ]`.
    - **Live Feedback:** Shows `✓ Setting updated` or `✗ Failed to update setting`.

---

## Future Architecture Roadmap

The system is designed to transition smoothly through future iterations:
- **Phase 3:** USB → Wi-Fi stream
- **Phase 4:** GPS + ultrasonic bathymetric sensors
- **Phase 5:** OpenCV edge person detection
- **Phase 6:** Autonomous incident dispatch & live survivor mapping
