import { Capacitor } from '@capacitor/core';
import { MediaSession } from '@jofr/capacitor-media-session';
import { readJSON, writeJSON } from './storage';

/**
 * Bluetooth / headset / lock-screen controls.
 *
 * Android's WebView has no Media Session API, so in the APK this goes through a native plugin
 * that creates a real Android media session (so Bluetooth headphones, car stereos and watches can
 * send play / pause / next / previous), shows a notification with controls and keeps audio alive
 * with the screen off. In a normal browser it falls back to the standard `navigator.mediaSession`.
 */
export { MediaSession };

export const isNative = Capacitor.isNativePlatform();

/** Run a media-session call and swallow "unavailable" rejections so playback never breaks. */
export function safeCall(fn: () => Promise<void> | void): void {
  try {
    void Promise.resolve(fn()).catch(() => undefined);
  } catch {
    /* unsupported */
  }
}

const artCache = new Map<string, string>();

/** Android can't decode SVG covers, so draw them to a PNG data URI for the notification. */
export function artworkForNotification(src: string): Promise<string | null> {
  if (!src.startsWith('data:image/svg') && !src.startsWith('http')) return Promise.resolve(src);
  const hit = artCache.get(src);
  if (hit) return Promise.resolve(hit);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = c.height = 256;
        c.getContext('2d')!.drawImage(img, 0, 0, 256, 256);
        const png = c.toDataURL('image/png');
        artCache.set(src, png);
        resolve(png);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/* ---------------- Bluetooth & headset preferences ---------------- */

export function getPauseOnDisconnect(): boolean {
  return readJSON<boolean>('pauseOnDisconnect', true);
}
export function setPauseOnDisconnect(v: boolean): void {
  writeJSON('pauseOnDisconnect', v);
}

/** Ask for notification permission (Android 13+) so the playback controls show in the shade. */
export async function requestNotificationAccess(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (!isNative) return 'unsupported';
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const cur = await LocalNotifications.checkPermissions();
    if (cur.display === 'granted') return 'granted';
    const res = await LocalNotifications.requestPermissions();
    return res.display === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'unsupported';
  }
}
