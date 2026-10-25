import { clear, createStore, del, get, set } from 'idb-keyval';

/**
 * IndexedDB wrapper. Holds library metadata (playlists, likes, history, upload metadata)
 * and the raw audio Blobs of files the user uploaded.
 */
let store: ReturnType<typeof createStore> | null = null;

function getStore() {
  if (!store) store = createStore('vibeplay', 'kv');
  return store;
}

export async function dbGet<T>(k: string): Promise<T | undefined> {
  try {
    return await get<T>(k, getStore());
  } catch {
    return undefined;
  }
}

export async function dbSet(k: string, value: unknown): Promise<boolean> {
  try {
    await set(k, value, getStore());
    return true;
  } catch {
    return false;
  }
}

export async function dbDel(k: string): Promise<void> {
  try {
    await del(k, getStore());
  } catch {
    /* ignore */
  }
}

export async function dbClear(): Promise<void> {
  try {
    await clear(getStore());
  } catch {
    /* ignore */
  }
}
