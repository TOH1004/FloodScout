import os
import urllib.request
import urllib.parse
import json

OUTPUT_DIR = os.path.join(os.getcwd(), 'public', 'image', 'components')
os.makedirs(OUTPUT_DIR, exist_ok=True)

HEADERS = {'User-Agent': 'FloodScoutBot/1.0 (floodscout@utm.edu.my)'}

# Direct known good URLs
DIRECT_URLS = {
    'eye': 'https://files.seeedstudio.com/wiki/SeeedStudio-XIAO-ESP32S3/img/xiaoesp32s3sense.jpg',
    'brain': 'https://files.seeedstudio.com/wiki/SeeedStudio-XIAO-ESP32S3/img/xiaoesp32s3.jpg', # or nodeMCU esp32
}

COMMONS_SEARCHES = {
    'brain': ['NodeMCU ESP32', 'ESP32 development board', 'ESP-WROOM-32'],
    'connector': ['ESP32 expansion board', 'Arduino expansion board shield', 'Terminal breakout board'],
    'remote': ['RC transmitter', 'Radio control transmitter', 'HotRC transmitter'],
    'muscle': ['ROV thruster', 'Underwater thruster', 'Brushless motor propeller underwater'],
    'driver': ['Electronic speed control ESC', 'Brushless ESC', 'RC ESC 30A'],
    'joint': ['Micro servo SG90', 'Tower Pro SG90', 'Servo motor RC'],
    'neck': ['Pan tilt camera bracket', 'Pan and tilt servo bracket', 'Camera gimbal platform'],
    'sense': ['HC-SR04 Ultrasonic Sensor', 'HC-SR04'],
    'navigator': ['GPS NEO-8M module', 'NEO-6M GPS module', 'GPS module antenna'],
    'heart': ['Lithium polymer battery pack', 'LiPo battery 4S', 'RC LiPo battery'],
    'power-link': ['XT60 connector', 'XT-60 plug', 'Battery connector RC'],
    'distributor': ['XT60 parallel connector', 'XT60 splitter cable', 'T-plug parallel connector'],
    'power-cable': ['Silicone wire AWG', 'Copper stranded wire silicone', 'Electrical wire silicone'],
    'signal-wire': ['Hookup wire 22 AWG', 'Jumper wire cable', 'Ribbon cable wire'],
    'quick-link': ['Dupont jumper wire', 'Breadboard jumper wires', 'Jumper wire ribbon'],
    'protector': ['Heat shrink tubing', 'Heat shrink tube polyolefin', 'Heat shrink sleeve'],
    'guardian': ['Blade fuse automotive', 'Fuse box blade fuse holder', 'Car blade fuse'],
    'regulator': ['LM2596 buck converter module', 'Step down converter LM2596', 'Buck converter DC-DC'],
    'shelter': ['Waterproof junction box plastic', 'Electronics project box enclosure', 'Plastic enclosure box'],
    'foundation': ['PVC pipe cap end cap', 'UPVC pipe fitting cap', 'PVC end cap'],
    'hull': ['White PVC pipe', 'PVC pipe tube', 'Plastic plumbing pipe'],
}

def get_commons_image_url(query):
    try:
        search_url = f"https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(query)}&srnamespace=6&format=json"
        req = urllib.request.Request(search_url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
        
        search_results = data.get('query', {}).get('search', [])
        if not search_results:
            return None
        
        for item in search_results:
            title = item['title']
            # Avoid svg, audio, video, pdf
            lower = title.lower()
            if any(ext in lower for ext in ['.jpg', '.jpeg', '.png', '.webp']):
                info_url = f"https://commons.wikimedia.org/w/api.php?action=query&titles={urllib.parse.quote(title)}&prop=imageinfo&iiprop=url&iiurlwidth=600&format=json"
                req_info = urllib.request.Request(info_url, headers=HEADERS)
                with urllib.request.urlopen(req_info, timeout=10) as resp_info:
                    info_data = json.loads(resp_info.read().decode('utf-8'))
                
                pages = info_data.get('query', {}).get('pages', {})
                for p in pages.values():
                    imageinfo = p.get('imageinfo', [])
                    if imageinfo:
                        return imageinfo[0].get('thumburl') or imageinfo[0].get('url')
    except Exception as e:
        print(f"Error searching Commons for '{query}': {e}")
    return None

def download_file(url, filepath):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as resp:
            content = resp.read()
            if len(content) > 1000:
                with open(filepath, 'wb') as f:
                    f.write(content)
                return True
    except Exception as e:
        print(f"Download failed for {url}: {e}")
    return False

def main():
    for comp_id, searches in COMMONS_SEARCHES.items():
        filepath = os.path.join(OUTPUT_DIR, f"{comp_id}.jpg")
        if os.path.exists(filepath) and os.path.getsize(filepath) > 3000:
            print(f"[EXISTS] {comp_id}.jpg ({os.path.getsize(filepath)} bytes)")
            continue
        
        # Check direct first
        if comp_id in DIRECT_URLS:
            print(f"[DIRECT] Downloading {comp_id} from direct URL...")
            if download_file(DIRECT_URLS[comp_id], filepath):
                print(f"  [SAVED DIRECT] {comp_id}.jpg")
                continue
        
        # Try searches
        found = False
        for q in searches:
            print(f"[SEARCH] {comp_id} -> '{q}'")
            img_url = get_commons_image_url(q)
            if img_url:
                print(f"  Found image: {img_url[:90]}...")
                if download_file(img_url, filepath):
                    print(f"  [SAVED] {comp_id}.jpg ({os.path.getsize(filepath)} bytes)")
                    found = True
                    break
        if not found:
            print(f"  [NOT FOUND] {comp_id}")

if __name__ == '__main__':
    main()
