# FloodScout — AI-Assisted Flood Search & Rescue System

FloodScout is an AI-assisted search-and-rescue platform designed to aid first responders during flood disaster operations. The system pairs real-time optical/thermal surveillance with **Ultralytics YOLO** person detection, tracking survivor count, confidence ratings, sonar bathymetry, and mission logging in a centralized mission command dashboard.

```
                    SYSTEM ARCHITECTURE
┌─────────────────────────────────────────────────────────────┐
│ USB Camera (Index 0 / 1 / 2)                                │
│       ↓                                                     │
│ OpenCV VideoCapture (camera.py — CameraSource ABC)          │
│       ↓                                                     │
│ Ultralytics YOLO11n (detector.py — Class 0: Person)         │
│       ↓ (CUDA GPU accelerated / CPU fallback)               │
│ FastAPI Server (main.py — Port 8000)                        │
│   ├── GET  /health                                          │
│   ├── GET  /camera/status                                   │
│   ├── GET  /detection/status                                │
│   ├── GET  /detection/history                               │
│   ├── POST /detection/threshold                             │
│   └── GET  /video_feed (MJPEG Stream with bounding boxes)   │
│       ↓ HTTP / Polling (CORS enabled)                       │
│ FloodScout Web Dashboard (React + Vite + Tailwind CSS)      │
│   ├── Live YOLO video feed with tactical HUD reticle        │
│   ├── Camera Connection status (Connected / Disconnected)   │
│   ├── Real-time Person Count & Highest Confidence metrics   │
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

#### NVIDIA GPU Acceleration (Recommended since you have an NVIDIA GPU)
The standard `requirements.txt` installs PyTorch. To enable hardware-accelerated YOLO inference on your NVIDIA GPU using CUDA, run:

```powershell
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124
```
*Ultralytics YOLO will automatically detect and utilize your NVIDIA GPU.*

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
| `CONFIDENCE_THRESHOLD` | `0.50` | Minimum YOLO confidence to qualify a detection (0.05 to 0.95) |
| `ALERT_COOLDOWN` | `3.0` | Debounce duration in seconds between consecutive alert triggers |
| `BACKEND_PORT` | `8000` | HTTP port for the FastAPI server |

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
  - Person Count: `0`, Confidence: `0%`
  - History logs: `Zone clear — No person`
- **One Person in View:**
  - YOLO renders an emerald-green bounding box labeled `PERSON [xx]%` around the subject.
  - Alert banner lights up: `🚨 PERSON DETECTED — Count: 1, Conf: [xx]%`
  - Header updates to reflect active target.
- **Multiple People in View:**
  - Person count accurately increments (`People: 2+`).
  - Highest confidence score is surfaced.
- **Adjust Sensitivity:**
  - In the **Controls** panel (`Controls`), use the **AI Detection Sensitivity** slider to adjust the YOLO threshold live between 10% and 95%.

---

## Migrating from USB Camera to ESP32-CAM (Future Architecture)

The system is built around an extensible `CameraSource` abstract base class located in `backend/camera.py`.

When you are ready to replace the USB camera with an ESP32-CAM:

1. **Subclass `CameraSource` in `backend/camera.py`:**
   ```python
   class ESP32CameraSource(CameraSource):
       def __init__(self, stream_url: str):
           self.stream_url = stream_url
           self._cap = cv2.VideoCapture(self.stream_url)

       def read(self):
           if not self._cap.isOpened():
               self._cap.open(self.stream_url)
           return self._cap.read()

       def is_connected(self):
           return self._cap.isOpened()

       def release(self):
           self._cap.release()

       def get_info(self):
           return {"connected": self.is_connected(), "type": "ESP32-CAM", "url": self.stream_url}
   ```

2. **Update `backend/main.py`:**
   Swap `USBCameraSource(camera_index=...)` to `ESP32CameraSource(stream_url="http://<ESP32_IP>:81/stream")`.
3. **No changes to `detector.py` or frontend components are required!**
   The YOLO inference, debounced alerts, MJPEG streaming, and dashboard panels remain completely identical.
4. **Enable Brightness Control:**
   Remove the `disabled` attribute on the Brightness slider in `src/pages/Dashboard.tsx` and connect it to the ESP32 `/control?var=brightness&val=...` endpoint.
