import { STORAGE_PREFIX } from '../config';

/** Tiny, failure-tolerant wrapper around localStorage (private mode / quota safe). */
const key = (k: string) => `${STORAGE_PREFIX}:${k}`;

export function readJSON<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key(k));
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeJSON(k: string, value: unknown): void {
  try {
    localStorage.setItem(key(k), JSON.stringify(value));
  } catch {
    /* storage unavailable or full - preferences just won't persist */
  }
}

export function readString(k: string): string | null {
  try {
    return localStorage.getItem(key(k));
  } catch {
    return null;
  }
}

export function writeString(k: string, value: string): void {
  try {
    localStorage.setItem(key(k), value);
  } catch {
    /* ignore */
  }
}

export function removeKey(k: string): void {
  try {
    localStorage.removeItem(key(k));
  } catch {
    /* ignore */
  }
}

export function clearAllPrefs(): void {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(`${STORAGE_PREFIX}:`))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
