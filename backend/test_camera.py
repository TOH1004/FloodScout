"""
test_camera.py — Quick diagnostic utility to test USB camera indices on Windows.

Run:
  python test_camera.py

Scans indices 0, 1, 2, 3 to detect plugged-in webcams and reports their status and resolution.
"""

import cv2
import sys

def scan_cameras(max_index=4):
    print("========================================")
    print("   FloodScout Camera Diagnostic Tool   ")
    print("========================================")
    print(f"Scanning camera indices 0 to {max_index - 1}...\n")

    found_any = False

    for idx in range(max_index):
        print(f"Testing Camera Index [{idx}]...", end=" ", flush=True)

        # On Windows, DirectShow (CAP_DSHOW) is usually faster & more reliable for USB webcams
        cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
        if not cap.isOpened():
            cap = cv2.VideoCapture(idx)

        if cap.isOpened():
            ret, frame = cap.read()
            if ret and frame is not None:
                h, w = frame.shape[:2]
                print(f"CONNECTED! (Resolution: {w}x{h})")
                print(f"  -> Recommended: Set CAMERA_INDEX={idx} in backend/.env")
                found_any = True
            else:
                print("OPENED, but failed to grab frame.")
            cap.release()
        else:
            print("Unavailable")

    print("\n----------------------------------------")
    if found_any:
        print("Scan complete. Use the connected index in backend/.env")
    else:
        print("No camera detected. Please check USB cable connection and permissions.")
    print("========================================")

if __name__ == "__main__":
    scan_cameras()
