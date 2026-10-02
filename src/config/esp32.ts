/**
 * esp32.ts — Centralized Wi-Fi configuration for the ESP32 Pan & Tilt system.
 * 
 * To update the ESP32 IP address:
 * - Option 1: Edit DEFAULT_ESP32_IP below, OR
 * - Option 2: Set VITE_ESP32_PAN_TILT_URL in the project's root .env file:
 *             VITE_ESP32_PAN_TILT_URL=http://10.185.112.106
 */

export const DEFAULT_ESP32_IP = '10.185.112.106';

const STORAGE_KEY = 'floodscout_esp32_url';

/**
 * Returns the currently active ESP32 Base URL.
 * Checks localStorage first, then env variable VITE_ESP32_PAN_TILT_URL, then DEFAULT_ESP32_IP.
 */
export function getEsp32BaseUrl(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved.trim()) {
      let cleaned = saved.trim();
      // Guard: 10.185.112.149 is the separate Camera board, not the pan/tilt & sensor board
      if (cleaned.includes('10.185.112.149')) {
        cleaned = `http://${DEFAULT_ESP32_IP}`;
        try { localStorage.setItem(STORAGE_KEY, cleaned); } catch {}
      }
      if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
        cleaned = `http://${cleaned}`;
      }
      return cleaned.replace(/\/+$/, '');
    }
  } catch {
    // localStorage might not be available in non-browser context
  }

  const envUrl = import.meta.env.VITE_ESP32_PAN_TILT_URL as string | undefined;
  if (envUrl && envUrl.trim()) {
    let cleaned = envUrl.trim();
    if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
      cleaned = `http://${cleaned}`;
    }
    return cleaned.replace(/\/+$/, '');
  }

  return `http://${DEFAULT_ESP32_IP}`;
}

/**
 * Updates the stored ESP32 Base URL in localStorage.
 */
export function setEsp32BaseUrl(rawInput: string): string {
  let cleaned = rawInput.trim();
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `http://${cleaned}`;
  }
  cleaned = cleaned.replace(/\/+$/, '');
  try {
    localStorage.setItem(STORAGE_KEY, cleaned);
  } catch {
    // ignore
  }

  // Broadcast to all hooks and notify backend
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('floodscout_esp32_url_changed', { detail: cleaned }));
    fetch(`/api/esp32/config?target=${encodeURIComponent(cleaned)}`, { method: 'POST' }).catch(() => {});
  }

  return cleaned;
}

/**
 * Clears the stored ESP32 Base URL, resetting to default.
 */
export function resetEsp32BaseUrl(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export const ESP32_BASE_URL: string = getEsp32BaseUrl();

