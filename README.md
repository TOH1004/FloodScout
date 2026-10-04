<div align="center">

# 🌊 FloodScout
### Compact Flood Search-and-Rescue Reconnaissance Vehicle

**Team:** Toh Shee Thong · Yeat Jing Rong · Chew Jia Sheng · Dawson Chan Shang Lin
**Track:** Global Impact
**Problem Statement:** Flood Search-and-Rescue / Victim Localisation

<br>

> *“When flooded areas become difficult to inspect,*  
> *rescuers need more than a wide-area view.*  
> ***They need a closer look at water level.”***

<br>

**Deploy → Navigate → Scan → Detect → Confirm → Localise → Inform Rescue Team**


| Resource | Link |
|---|---|
| 📄 Documentation | [View Documentation](https://drive.google.com/file/d/1b0v3hBeZCKS2G16Wo0ZVKvWsUMepULTB/view?usp=sharing) |
| 🎥 Demo Video | [Watch Demo Video](https://drive.google.com/file/d/1w0KB5JXJXWeRGugl_taHCY_Cb30htfpa/view?usp=drive_link) |
| 💰 Financial Document | [View Financial Document](https://drive.google.com/file/d/1cxrFeNK1FRoSCJ-a3GuzziTtApQRbJx-/view?usp=sharing) |
| 📝 Nexus Log | [View Nexus Log](YOUR_NEXUS_LOG_LINK) |
| 🌐 Live Website | [Visit FloodScout Dashboard](https://flood-scout-ecru.vercel.app/) |

</div>

---

## 1. Project Overview

### The Problem

Flooding can rapidly isolate residents, block roads and make some structures difficult to inspect. Although rescue boats, emergency personnel and aerial observation are essential, victims may remain difficult to observe when buildings, debris, narrow passages or other structures obstruct the line of sight.

Malaysia recorded 1,345 flood incidents in 2024, compared with 809 in 2023. Flooding also caused an estimated RM933.4 million in losses in 2024, including RM372.2 million in damage to living quarters [1][2].

Documented Malaysian incidents show that people can remain trapped inside houses, sheds and care facilities after surrounding areas become flooded [3–6]. These cases highlight a specific search challenge: a victim may be physically close to rescuers while remaining difficult to observe because the environment blocks the line of sight.

### The Search and Localisation Gap

Flood response already uses rescue boats, emergency personnel and aerial observation. FloodScout is not intended to replace these resources.

Instead, it addresses an earlier stage of the rescue process:

**Incident → Search → Victim Detection → Location Confirmation → Rescue Deployment → Evacuation**

Drones are effective for rapid wide-area assessment, but aerial cameras can be affected by occlusion from buildings, roofs, trees, bridges and other structures. Rescue boats are essential for evacuation but may be too large for some narrow or partially obstructed residential spaces [7].

### Target Users

| Stakeholder | Operational Need |
|---|---|
| **Fire and Rescue Department of Malaysia (JBPM/BOMBA)** | Close-range reconnaissance before physical inspection |
| **Malaysia Civil Defence Force (APM)** | Supporting information during flood search operations |
| **Trained volunteer rescue teams** | Visual and location information in difficult-to-inspect areas |
| **Authorised incident command** | Additional reconnaissance information for search prioritisation |

---

## 2. Proposed Solution

### What Is FloodScout?

**FloodScout is a compact, remotely operated catamaran-style surface vehicle designed for close-range flood reconnaissance.**

It provides a water-level perspective for areas that may be difficult to assess from an aerial viewpoint or from a larger rescue boat, while keeping navigation and rescue decisions under human control.

### Core System

The final prototype combines:

| Capability | Implementation |
|---|---|
| **Manual Navigation** | HotRC CT-6A transmitter + F-06A receiver |
| **Propulsion** | Two BLDC underwater thrusters with bidirectional ESCs |
| **Camera Streaming** | Seeed Studio XIAO ESP32-S3 Sense |
| **Camera Positioning** | Two SG90 pan/tilt servos |
| **Computer Vision** | Laptop-based OpenCV pipeline |
| **Positioning** | GY-NEO8M GPS |
| **Distance Awareness** | HC-SR04 ultrasonic sensor |
| **Operator Interface** | Web-based tactical dashboard |

### Operational Workflow

**Deploy → Navigate → Scan → Detect → Confirm → Localise → Inform Rescue Team**

The computer-vision output is advisory. A potential visual detection must be reviewed and confirmed by the human operator before the area is prioritised for rescue inspection.


---

# System Architecture

FloodScout separates propulsion, camera/sensor control, and vision processing into dedicated systems. This allows each subsystem to operate independently and makes the prototype easier to troubleshoot.

```text
                         FLOODSCOUT
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
   NodeMCU ESP32 #1   NodeMCU ESP32 #2    XIAO ESP32-S3
   Propulsion Control Camera/Sensor       Camera Module
          │                  │                  │
          │                  │                  │
    HotRC Receiver      Pan/Tilt Servo       Wi-Fi
    Dual ESCs           GPS                  │
    Dual Thrusters      HC-SR04              │
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                             ▼
                    Operator Laptop
                             │
                    ┌────────┴────────┐
                    │                 │
                 OpenCV          Web Dashboard
                 Processing       React + Vite
                    │                 │
                    └────────┬────────┘
                             │
                       Operator Review
```

### Control Architecture

| Subsystem | Controller | Communication |
|---|---|---|
| Propulsion | NodeMCU ESP32 #1 | HotRC 2.4 GHz RC |
| Camera / Sensors | NodeMCU ESP32 #2 | Wi-Fi |
| Camera Streaming | XIAO ESP32-S3 Sense | Wi-Fi |
| Vision Processing | Laptop | OpenCV |
| Web Dashboard | Laptop | React + Vite |
| Camera Pan/Tilt | Web Dashboard → ESP32 #2 | HTTP / Wi-Fi |

Propulsion remains under direct manual RC control, while the laptop dashboard is primarily used for visual monitoring, camera positioning, sensor information, and detection review.

---

# Project Structure

```text
FloodScout/
│
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── test_camera.py
│   ├── test_pan_tilt.py
│   ├── .env
│   ├── captures/
│   └── ...
│
├── firmware/
│   ├── esp32_pan_tilt/
│   │   └── esp32_pan_tilt.ino
│   │
│   └── xiao_camera_serial/
│       └── xiao_camera_serial.ino
│
├── src/
│   └── ...
│
├── public/
│   └── ...
│
├── .env
├── package.json
├── vite.config.*
└── README.md
```

---

# Requirements

## Software

| Software | Recommended |
|---|---|
| Windows | Windows 10 / 11 64-bit |
| Python | 3.10.x / 3.11.x |
| Node.js | v18+ / v20+ LTS |
| npm | Included with Node.js |
| Arduino IDE | 2.3+ |
| ESP32 Board Package | Latest compatible version |

You will also need the appropriate **CP210x / CH340 USB driver** for Windows to recognize the ESP32 COM ports.

Check your installations:

```powershell
python --version
pip --version
node --version
npm --version
```

---

#  Setup Guide

## 1. Clone the Repository

```powershell
git clone https://github.com/TOH1004/FloodScout.git
cd FloodScout
```

---

# 2. Configure the ESP32 Controller

Open:

```text
firmware/esp32_pan_tilt/esp32_pan_tilt.ino
```

Update the Wi-Fi credentials:

```cpp
const char* WIFI_SSID = "Your_WiFi_Hotspot_Name";
const char* WIFI_PASSWORD = "Your_WiFi_Password";
```

The ESP32 must connect to the **same Wi-Fi network or mobile hotspot as the operator laptop**.

### Arduino Libraries

Install:

- `ESP32Servo`
- `TinyGPSPlus`

`WiFi` and `WebServer` are provided by the ESP32 Arduino board package.

### Board

Select:

```text
Tools
→ Board
→ esp32
→ ESP32 Dev Module
```

Then select the correct COM port and upload the firmware.

Open Serial Monitor:

```text
115200 baud
```

After rebooting the ESP32, look for:

```text
Wi-Fi Connected!
ESP32 IP: 10.xxx.xxx.xxx
FloodScout System Ready & Serving Web API.
```

**Copy this IP address.**

You will use it later in the backend and frontend configuration.

---

# 3. Configure the XIAO Camera

If you are using the onboard XIAO ESP32-S3 Sense camera, open:

```text
firmware/xiao_camera_serial/xiao_camera_serial.ino
```

In Arduino IDE select:

```text
Tools
→ Board
→ esp32
→ XIAO_ESP32S3
```

Recommended settings:

```text
PSRAM: OPI PSRAM
Flash Mode: QIO 80MHz
```

Upload the firmware to the XIAO.

Depending on your configuration, the camera can provide a Wi-Fi stream such as:

```text
http://YOUR_XIAO_IP:81/stream
```

The XIAO operates independently from the camera/sensor ESP32 controller. The final architecture uses Wi-Fi for the camera stream rather than a wired connection between the two controllers.

---

# 4. Setup the Python Backend

Open a new PowerShell terminal:

```powershell
cd backend
```

Create a Python virtual environment:

```powershell
python -m venv venv
```

Activate it:

```powershell
.\venv\Scripts\Activate.ps1
```

If PowerShell blocks the activation script:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Then activate again:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
pip install --upgrade pip
pip install -r requirements.txt
```

### OpenCV Compatibility

FloodScout uses OpenCV's HOG person detector.

Use:

```text
opencv-python >= 4.8
opencv-python < 5
```

Do **not** use OpenCV 5.x because the implemented HOG detector depends on the `cv2.HOGDescriptor` API.

---

# 5. Configure Backend Environment

Create:

```text
backend/.env
```

Example:

```env
# Camera
CAMERA_INDEX=0
CAMERA_WIDTH=1280
CAMERA_HEIGHT=720
CAMERA_FPS=30

# Optional Wi-Fi camera
# CAMERA_URL=http://YOUR_XIAO_IP:81/stream

# OpenCV Detection
HOG_DETECTION_THRESHOLD=0.0
HOG_MODE=fast

# Detection / Alert
ALERT_COOLDOWN=3.0
DETECTION_COOLDOWN=5.0
CLEAR_HOLD_SECONDS=3.0

# Backend
BACKEND_PORT=8000
CAPTURES_DIR=captures

# Gemini Vision - Optional
VISION_API_KEY=YOUR_GEMINI_API_KEY_HERE
VISION_MODEL=gemini-3.6-flash

# XIAO Serial - only required when using USB control
XIAO_SERIAL_PORT=COM4
XIAO_SERIAL_BAUD=115200

# GPS
GPS_SERIAL_PORT=COM5
GPS_SERIAL_BAUD=115200

# ESP32 Pan/Tilt
PAN_TILT_MODE=esp32
ESP32_BASE_URL=http://YOUR_ESP32_IP
SERVO_STEP=5
```

### Important

Replace:

```env
ESP32_BASE_URL=http://YOUR_ESP32_IP
```

with the IP address shown by the ESP32 Serial Monitor.

For example:

```env
ESP32_BASE_URL=http://10.133.81.106
```

If using a Wi-Fi XIAO camera:

```env
CAMERA_URL=http://YOUR_XIAO_IP:81/stream
```

---

# 6. Test the Hardware

Before launching the complete system, test the camera:

```powershell
python test_camera.py
```

Example:

```text
Testing Camera Index [0]... CONNECTED!
Testing Camera Index [1]... Unavailable
```

If camera `0` works, use:

```env
CAMERA_INDEX=0
```

Test the pan/tilt controller:

```powershell
python test_pan_tilt.py
```

This checks the pan/tilt controller and its hardware/mock operation.

---

# 7. Start the Backend

From the `backend` directory:

```powershell
python main.py
```

The backend runs on:

```text
http://localhost:8000
```

Useful endpoints:

### API Documentation

```text
http://localhost:8000/docs
```

### Health Check

```text
http://localhost:8000/health
```

### Processed Video Stream

```text
http://localhost:8000/video_feed
```

---

# 8. Setup the Frontend

Open a **second PowerShell terminal** at the project root:

```powershell
cd FloodScout
```

Install Node dependencies:

```powershell
npm install
```

Create or update the root `.env`:

```env
VITE_API_URL=http://localhost:8000

VITE_ESP32_PAN_TILT_URL=http://YOUR_ESP32_IP

VITE_CAMERA_STREAM_URL=http://YOUR_XIAO_IP:81/stream
```

For example:

```env
VITE_API_URL=http://localhost:8000

VITE_ESP32_PAN_TILT_URL=http://10.133.81.106

VITE_CAMERA_STREAM_URL=http://10.133.81.149:81/stream
```

---

# 9. Start the Website

Run:

```powershell
npm run dev
```

Vite will provide a local URL similar to:

```text
http://localhost:5173/
```

Open:

```text
http://localhost:5173/dashboard
```

or:

```text
http://localhost:5173/robot-control
```

---

# Dashboard

The FloodScout dashboard brings the main reconnaissance information into one interface.

### 📷 Water-Level Camera

Displays the live camera view from the XIAO ESP32-S3 Sense.

The camera allows the operator to inspect:

- Building entrances
- Porches
- Narrow passages
- Areas obstructed from an aerial viewpoint

The OpenCV pipeline can process the video and provide potential person detections for operator review.

### Tactical Map

Displays the robot's GPS position.

The GPS represents the **robot's location**, not an exact victim coordinate.

### Camera Navigation

Use the dashboard controls to move:

```text
        ↑
     Tilt Up

← Pan Left     Pan Right →

     Tilt Down
        ↓
```

The commands are sent through Wi-Fi to ESP32 #2.

### Obstacle Monitoring

The HC-SR04 provides approximate front-distance information.

It is intended for:

- Proximity awareness
- Confined-area navigation
- Operator warning

It is **not** underwater sonar or a flood-depth sensor.

### Detection Log

The dashboard can record:

- Detection time
- Detection result
- Confidence
- Robot position
- Operator verification status

---

# Operating Workflow

```text
DEPLOY
   ↓
NAVIGATE
   ↓
SCAN
   ↓
DETECT
   ↓
CONFIRM
   ↓
LOCALISE
   ↓
INFORM RESCUE TEAM
```

The intended workflow is operator-assisted rather than autonomous. A detection should be visually confirmed before the location is prioritised for rescue inspection.

---

# Pre-Operation Checklist

Before deployment:

- [ ] Inspect PVC pontoons
- [ ] Check electronics enclosure for water ingress
- [ ] Check wiring and connectors
- [ ] Confirm both 30 A fuses are installed
- [ ] Confirm thrusters rotate freely
- [ ] Check camera mounting
- [ ] Check GPS mounting
- [ ] Check HC-SR04 mounting
- [ ] Check SG90 servos
- [ ] Verify both LM2596 outputs are approximately 5 V

These checks follow the final prototype's operating procedure.

---

# Power-Up Procedure

1. Set the HotRC throttle to neutral.
2. Turn on the HotRC transmitter.
3. Power the 4S propulsion/RC branch.
4. Confirm ESP32 #1 and F-06A receiver are active.
5. Power the 2S camera/sensor branch.
6. Open the FloodScout dashboard.
7. Verify:
   - Camera feed
   - GPS
   - Distance reading
   - Pan/tilt controls
8. Perform a low-throttle propulsion test.

---

# Shutdown Procedure

1. Return both thrusters to neutral.
2. Disconnect propulsion power.
3. Disconnect the camera/sensor power branch.
4. Turn off the HotRC transmitter.
5. Dry and inspect the robot before storage.

---

# Troubleshooting

## Camera Not Detected

Run:

```powershell
python backend/test_camera.py
```

Then update:

```env
CAMERA_INDEX=0
```

or another available index.

Also check:

```text
Windows Settings
→ Privacy & Security
→ Camera
```

and make sure camera access is enabled.

---

## ESP32 Dashboard Shows "Network Error"

Check that:

1. The laptop and ESP32 are connected to the **same Wi-Fi network/hotspot**.
2. The ESP32 Serial Monitor shows a valid IP.
3. `.env` contains the correct ESP32 IP.

Update:

```env
ESP32_BASE_URL=http://YOUR_ESP32_IP
```

and:

```env
VITE_ESP32_PAN_TILT_URL=http://YOUR_ESP32_IP
```

You can test the ESP32 directly:

```text
http://YOUR_ESP32_IP/api/pan-tilt/status
```

---

## COM Port Permission Error

If you see:

```text
SerialException: could not open port
PermissionError
```

close:

- Arduino Serial Monitor
- Arduino IDE serial tools
- Any other program using the COM port

If you are using Wi-Fi instead of USB serial control, disable the corresponding serial configuration.

---

## `cv2.HOGDescriptor` Error

If you see:

```text
cv2.error:
module 'cv2' has no attribute 'HOGDescriptor'
```

remove incompatible OpenCV versions:

```powershell
pip uninstall opencv-python opencv-contrib-python
```

Then install the compatible version:

```powershell
pip install "opencv-python>=4.8,<5"
```

---

## Gemini API Error

Gemini is an optional enhancement.

If the Gemini API is unavailable, FloodScout's core person-detection and logging pipeline can continue operating.

Check:

```env
VISION_API_KEY=YOUR_GEMINI_API_KEY
```

---

# Quick Start

Once everything has been configured, you only need two terminals.

### Terminal 1 — Backend

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python main.py
```

### Terminal 2 — Frontend

```powershell
npm run dev
```

Then open:

```text
http://localhost:5173/dashboard
```

---

# Hardware Configuration

The final prototype uses two separate controller systems.

### ESP32 #1 — Propulsion

| Function | GPIO |
|---|---:|
| F-06A CH1 — Steering | GPIO34 |
| F-06A CH2 — Throttle | GPIO35 |
| Left ESC | GPIO33 |
| Right ESC | GPIO32 |

### ESP32 #2 — Camera Motion & Sensors

| Function | GPIO |
|---|---:|
| Pan Servo | GPIO18 |
| Tilt Servo | GPIO19 |
| GPS RXD2 | GPIO12 |
| GPS TXD2 | GPIO13 |
| HC-SR04 TRIG | GPIO5 |
| HC-SR04 ECHO | GPIO4 |

These are the verified final prototype assignments documented in the technical documentation.

---

# Power Architecture

FloodScout uses two separate battery branches with a shared ground reference.

```text
             ┌─────────────────────┐
             │ 4S 14.8V LiPo       │
             └──────────┬──────────┘
                        │
              Propulsion / RC Branch
                        │
             ┌──────────┴──────────┐
             │                     │
          ESC #1                ESC #2
             │                     │
        Left Thruster        Right Thruster
             │                     |
          LM2596 #1 ────────────────
             │
       ESP32 #1 + Receiver


             ┌─────────────────────┐
             │ 2S 7.4V Li-ion      │
             └──────────┬──────────┘
                        │
              Camera / Sensor Branch
                        │
                    LM2596 #2
                        │
       ┌────────────────┼────────────────┐
       │                │                │
    ESP32 #2          XIAO            Sensors
       │                                │
   Pan/Tilt                         GPS + HC-SR04
```

The two positive power rails remain separate. Only the ground reference is shared.

> **Safety:** Do not power the SG90 servos or BLDC ESC system directly from an ESP32 3.3 V rail. Use the appropriate regulated power supply and common-ground arrangement.

---

# Hardware

The final prototype's verified hardware cost is **RM694.95**, within the RM700 Project Nexus hardware limit.

Main components include:

- Seeed Studio XIAO ESP32-S3 Sense
- 2 × NodeMCU ESP32
- ESP32 30-Pin Expansion Board
- HotRC 6CH 2.4 GHz transmitter + receiver
- 2 × BLDC underwater thrusters
- 2 × bidirectional ESCs
- 2 × SG90 servos
- HC-SR04 ultrasonic sensor
- GY-NEO8M GPS
- 4S 14.8 V LiPo battery
- 2 × LM2596 buck converters
- PVC pontoons
- Waterproof electronics enclosure
- PTZ camera bracket
- Front lights

---

# System Limitations

FloodScout is currently a **manually operated reconnaissance prototype**.

It does **not**:

- Autonomously navigate
- Autonomously rescue victims
- Perform facial identification
- See through walls or opaque structures
- Provide exact indoor victim coordinates
- Use the HC-SR04 as underwater sonar
- Replace trained rescue personnel

The operator remains responsible for navigation, interpreting detections, confirming potential victims, and communicating with the rescue team.

---

# Documentation

For the complete technical documentation, including:

- Background and problem statement
- Flood rescue scenario
- System architecture
- Mechanical design
- Electrical design
- Power architecture
- Component list
- Circuit connections
- Dashboard design
- Operating procedure
- Verified GPIO configuration

refer to the project's technical documentation.

The final software package consists of four main components:

1. Propulsion firmware
2. Camera-motion and sensor firmware
3. XIAO ESP32-S3 camera firmware
4. Laptop OpenCV application

---

## 🌊 From Detection to Rescue

FloodScout is designed around a simple idea:

> **Find the victim first. Then send the rescue team where they need to go.**

By combining a water-level camera, remote navigation, computer vision, GPS positioning, and real-time operator controls, FloodScout aims to reduce uncertainty during flood reconnaissance while keeping the human rescue team in control.
