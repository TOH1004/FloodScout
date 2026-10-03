import os
import urllib.request
import urllib.parse
import json
import re

OUTPUT_DIR = os.path.join(os.getcwd(), 'public', 'image', 'components')
os.makedirs(OUTPUT_DIR, exist_ok=True)

COMPONENTS = [
    {
        'id': 'eye',
        'query': 'Seeed Studio XIAO ESP32-S3 Sense camera module',
        'filename': 'eye.jpg'
    },
    {
        'id': 'brain',
        'query': 'NodeMCU ESP32 development board',
        'filename': 'brain.jpg'
    },
    {
        'id': 'connector',
        'query': 'ESP32 30-Pin Expansion Board breakout shield',
        'filename': 'connector.jpg'
    },
    {
        'id': 'remote',
        'query': 'HotRC CT-6A 6CH 2.4GHz Transmitter Receiver',
        'filename': 'remote.jpg'
    },
    {
        'id': 'muscle',
        'query': '12V 24V BLDC Underwater Thruster ROV motor',
        'filename': 'muscle.jpg'
    },
    {
        'id': 'driver',
        'query': 'Bidirectional Brushless ESC 30A with BEC',
        'filename': 'driver.jpg'
    },
    {
        'id': 'joint',
        'query': 'SG90 Micro Servo Motor 9g',
        'filename': 'joint.jpg'
    },
    {
        'id': 'neck',
        'query': 'PTZ Pan and Tilt Camera Bracket Platform Anti-Vibration',
        'filename': 'neck.jpg'
    },
    {
        'id': 'sense',
        'query': 'Ultrasonic Sensor HC-SR04 module',
        'filename': 'sense.jpg'
    },
    {
        'id': 'navigator',
        'query': 'GY-NEO8M GPS Module with ceramic antenna',
        'filename': 'navigator.jpg'
    },
    {
        'id': 'heart',
        'query': '4S 14.8V 2200mAh 25C LiPo Battery XT60',
        'filename': 'heart.jpg'
    },
    {
        'id': 'power-link',
        'query': 'XT60 Male Battery Connector Plug gold plated',
        'filename': 'power-link.jpg'
    },
    {
        'id': 'distributor',
        'query': 'XT60 Parallel Battery Connector 1 Male 2 Female Splitter',
        'filename': 'distributor.jpg'
    },
    {
        'id': 'power-cable',
        'query': '12 AWG Silicone Flexible Multicore Wire red black',
        'filename': 'power-cable.jpg'
    },
    {
        'id': 'signal-wire',
        'query': '22 AWG stranded hookup wire electrical cable',
        'filename': 'signal-wire.jpg'
    },
    {
        'id': 'quick-link',
        'query': 'Dupont Jumper Wires male to female ribbon cable breadboard',
        'filename': 'quick-link.jpg'
    },
    {
        'id': 'protector',
        'query': 'Heat Shrink Tube polyolefin tubing electrical insulation',
        'filename': 'protector.jpg'
    },
    {
        'id': 'guardian',
        'query': 'Inline Fuse Holder with Standard Blade Fuse box waterproof',
        'filename': 'guardian.jpg'
    },
    {
        'id': 'regulator',
        'query': 'LM2596 DC-DC Buck Step-Down Converter module',
        'filename': 'regulator.jpg'
    },
    {
        'id': 'shelter',
        'query': 'Waterproof Electronic Plastic Project Box Junction Enclosure 320x240',
        'filename': 'shelter.jpg'
    },
    {
        'id': 'foundation',
        'query': 'UPVC End Cap 80mm 82mm pipe fitting white',
        'filename': 'foundation.jpg'
    },
    {
        'id': 'hull',
        'query': 'White PVC Pipe cylindrical rigid plumbing tube',
        'filename': 'hull.jpg'
    }
]

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def search_ddg_image(query):
    try:
        token_url = f'https://duckduckgo.com/?q={urllib.parse.quote(query)}&iax=images&ia=images'
        req = urllib.request.Request(token_url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
        
        vqd_match = re.search(r'vqd=([0-9-]+)', html) or re.search(r'vqd="([0-9-]+)"', html)
        if not vqd_match:
            return None
        vqd = vqd_match.group(1)
        api_url = f'https://duckduckgo.com/i.js?l=us-en&o=json&q={urllib.parse.quote(query)}&vqd={vqd}&f=,,,&p=1'
        req2 = urllib.request.Request(api_url, headers=HEADERS)
        with urllib.request.urlopen(req2, timeout=10) as resp2:
            res = json.loads(resp2.read().decode('utf-8'))
            results = res.get('results', [])
            for r in results:
                img_url = r.get('image')
                if img_url and (img_url.endswith('.jpg') or img_url.endswith('.png') or img_url.endswith('.jpeg') or 'image' in img_url):
                    return img_url
    except Exception as e:
        print(f"Error searching DDG for '{query}': {e}")
    return None

def download_image(url, out_path):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as resp:
            content = resp.read()
            if len(content) > 2000:
                with open(out_path, 'wb') as f:
                    f.write(content)
                return True
    except Exception as e:
        print(f"Download failed for {url}: {e}")
    return False

def main():
    print(f"Starting component image fetch for {len(COMPONENTS)} components...")
    for comp in COMPONENTS:
        target_path = os.path.join(OUTPUT_DIR, comp['filename'])
        if os.path.exists(target_path) and os.path.getsize(target_path) > 3000:
            print(f"[EXISTS] {comp['id']} -> {comp['filename']} ({os.path.getsize(target_path)} bytes)")
            continue
        
        print(f"[SEARCHING] {comp['id']}: {comp['query']}")
        img_url = search_ddg_image(comp['query'])
        success = False
        if img_url:
            print(f"  -> Found URL: {img_url[:80]}...")
            success = download_image(img_url, target_path)
            if success:
                print(f"  [SAVED] {comp['filename']} ({os.path.getsize(target_path)} bytes)")
        
        if not success:
            print(f"  [WARN] Could not download image for {comp['id']}")

if __name__ == '__main__':
    main()
