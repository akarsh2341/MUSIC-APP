import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Playlist, Song } from '../types';
import { dbClear, dbDel, dbGet, dbSet } from '../lib/db';
import { makeCover } from '../lib/art';
import { buildIndex, buildMixes, type HistoryEntry, type LibraryIndex } from '../lib/library';
import { readJSON, writeJSON } from '../lib/storage';
import { toast, toastError, toastSuccess } from '../lib/toast';
import { moveItem, uid } from '../lib/utils';

const MAX_HISTORY = 100;
const MAX_RECENT_SEARCHES = 8;
const AUDIO_EXT = /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|weba|webm)$/i;

/** Metadata persisted for uploaded files; the audio Blob itself is stored under `blob:<id>`. */
type LocalMeta = Omit<Song, 'audioUrl'>;

interface AddResult {
  added: Song[];
  failed: string[];
}

interface LibraryValue extends LibraryIndex {
  ready: boolean;
  songs: Song[];
  playlists: Playlist[];
  mixes: Playlist[];
  likedIds: string[];
  likedSongs: Song[];
  history: HistoryEntry[];
  recentSongs: Song[];
  recentSearches: string[];

  isLiked: (id: string) => boolean;
  toggleLike: (id: string) => void;
  recordPlay: (id: string) => void;
  clearHistory: () => void;
  updateDuration: (id: string, seconds: number) => void;

  createPlaylist: (name: string, songIds?: string[]) => Playlist;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (id: string, songIds: string[]) => number;
  removeFromPlaylist: (id: string, songId: string) => void;
  reorderPlaylist: (id: string, from: number, to: number) => void;
  getPlaylist: (id: string) => Playlist | undefined;
  resolve: (ids: string[]) => Song[];

  addLocalFiles: (files: File[]) => Promise<AddResult>;
  removeLocalSong: (id: string) => void;
  localCount: number;

  addRecentSearch: (q: string) => void;
  removeRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;

  resetAll: () => Promise<void>;
}

const Ctx = createContext<LibraryValue | null>(null);

function parseFileName(name: string): { artist: string; title: string } {
  const base = name.replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim();
  const m = base.match(/^(.+?)\s+-\s+(.+)$/);
  if (m) return { artist: m[1].trim(), title: m[2].trim() };
  return { artist: 'Unknown Artist', title: base || 'Untitled' };
}

function readDuration(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const probe = new Audio();
    let done = false;
    const finish = (v: number | null) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      probe.removeAttribute('src');
      probe.load();
      resolve(v);
    };
    const timer = window.setTimeout(() => finish(null), 8000);
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => finish(Number.isFinite(probe.duration) ? probe.duration : 0);
    probe.onerror = () => finish(null);
    probe.src = url;
  });
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [local, setLocal] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [recentSearches, setRecentSearches] = useState<string[]>(() => readJSON<string[]>('recentSearches', []));
  const blobUrls = useRef(new Map<string, string>());

  // ---- Hydrate from IndexedDB ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [pl, liked, hist, meta] = await Promise.all([
        dbGet<Playlist[]>('playlists'),
        dbGet<string[]>('liked'),
        dbGet<HistoryEntry[]>('history'),
        dbGet<LocalMeta[]>('localMeta'),
      ]);
      const restored: Song[] = [];
      for (const m of meta ?? []) {
        const blob = await dbGet<Blob>(`blob:${m.id}`);
        if (!blob) continue; // audio was evicted by the browser; skip the orphaned metadata
        const url = URL.createObjectURL(blob);
        blobUrls.current.set(m.id, url);
        restored.push({ ...m, audioUrl: url });
      }
      if (cancelled) {
        restored.forEach((s) => URL.revokeObjectURL(s.audioUrl));
        blobUrls.current.clear();
        return;
      }
      setPlaylists(pl ?? []);
      setLikedIds(liked ?? []);
      setHistory(hist ?? []);
      setLocal(restored);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Persist (only after hydration so we never overwrite saved data with empty state) ----
  useEffect(() => {
    if (ready) void dbSet('playlists', playlists);
  }, [ready, playlists]);
  useEffect(() => {
    if (ready) void dbSet('liked', likedIds);
  }, [ready, likedIds]);
  useEffect(() => {
    if (ready) void dbSet('history', history);
  }, [ready, history]);
  useEffect(() => {
    if (!ready) return;
    const meta: LocalMeta[] = local.map(({ audioUrl: _omit, ...rest }) => rest);
    void dbSet('localMeta', meta);
  }, [ready, local]);
  useEffect(() => {
    writeJSON('recentSearches', recentSearches);
  }, [recentSearches]);

  // ---- Derived data ----
  const songs = useMemo(() => {
    return local.map((s) => (durations[s.id] && Math.abs(durations[s.id] - s.duration) > 0.5 ? { ...s, duration: durations[s.id] } : s));
  }, [local, durations]);

  const index = useMemo(() => buildIndex(songs), [songs]);
  const { songById } = index;

  const resolve = useCallback((ids: string[]) => ids.map((id) => songById.get(id)).filter((s): s is Song => !!s), [songById]);

  const likedSongs = useMemo(() => resolve(likedIds), [resolve, likedIds]);
  const recentSongs = useMemo(() => {
    const seen = new Set<string>();
    const out: Song[] = [];
    for (const h of history) {
      if (seen.has(h.id)) continue;
      const s = songById.get(h.id);
      if (s) {
        seen.add(h.id);
        out.push(s);
      }
    }
    return out;
  }, [history, songById]);

  const mixes = useMemo(() => buildMixes(songs, likedIds, history), [songs, likedIds, history]);

  // ---- Likes & history ----
  const isLiked = useCallback((id: string) => likedIds.includes(id), [likedIds]);

  const toggleLike = useCallback(
    (id: string) => {
      const title = songById.get(id)?.title ?? 'Song';
      if (likedIds.includes(id)) {
        setLikedIds((prev) => prev.filter((x) => x !== id));
        toast(`Removed "${title}" from Liked Songs`);
      } else {
        setLikedIds((prev) => [id, ...prev]);
        toastSuccess(`Added "${title}" to Liked Songs`);
      }
    },
    [likedIds, songById],
  );

  const recordPlay = useCallback((id: string) => {
    setHistory((prev) => [{ id, at: Date.now() }, ...prev].slice(0, MAX_HISTORY));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    toast('Listening history cleared');
  }, []);

  const updateDuration = useCallback((id: string, seconds: number) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    setDurations((prev) => (Math.abs((prev[id] ?? 0) - seconds) < 0.5 ? prev : { ...prev, [id]: seconds }));
  }, []);

  // ---- Playlists ----
  const createPlaylist = useCallback((name: string, songIds: string[] = []) => {
    const now = Date.now();
    const pl: Playlist = {
      id: `pl-${uid()}`,
      name: name.trim() || 'New playlist',
      songIds: Array.from(new Set(songIds)),
      createdAt: now,
      updatedAt: now,
    };
    setPlaylists((prev) => [pl, ...prev]);
    return pl;
  }, []);

  const renamePlaylist = useCallback((id: string, name: string) => {
    const clean = name.trim();
    if (!clean) return;
    setPlaylists((prev) => prev.map((p) => (p.id === id ? { ...p, name: clean, updatedAt: Date.now() } : p)));
  }, []);

  const deletePlaylist = useCallback((id: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addToPlaylist = useCallback(
    (id: string, ids: string[]) => {
      const pl = playlists.find((p) => p.id === id);
      if (!pl) return 0;
      const fresh = Array.from(new Set(ids)).filter((x) => !pl.songIds.includes(x));
      if (!fresh.length) return 0;
      setPlaylists((prev) => prev.map((p) => (p.id === id ? { ...p, songIds: [...p.songIds, ...fresh], updatedAt: Date.now() } : p)));
      return fresh.length;
    },
    [playlists],
  );

  const removeFromPlaylist = useCallback((id: string, songId: string) => {
    setPlaylists((prev) => prev.map((p) => (p.id === id ? { ...p, songIds: p.songIds.filter((s) => s !== songId), updatedAt: Date.now() } : p)));
  }, []);

  const reorderPlaylist = useCallback((id: string, from: number, to: number) => {
    setPlaylists((prev) => prev.map((p) => (p.id === id ? { ...p, songIds: moveItem(p.songIds, from, to), updatedAt: Date.now() } : p)));
  }, []);

  const getPlaylist = useCallback(
    (id: string) => playlists.find((p) => p.id === id) ?? mixes.find((m) => m.id === id),
    [playlists, mixes],
  );

  // ---- Local files ----
  const addLocalFiles = useCallback(async (files: File[]): Promise<AddResult> => {
    const added: Song[] = [];
    const failed: string[] = [];
    for (const file of files) {
      if (!(file.type.startsWith('audio/') || AUDIO_EXT.test(file.name))) {
        failed.push(file.name);
        continue;
      }
      const url = URL.createObjectURL(file);
      const duration = await readDuration(url);
      if (duration === null) {
        URL.revokeObjectURL(url);
        failed.push(file.name);
        continue;
      }
      const id = `local-${uid()}`;
      const { artist, title } = parseFileName(file.name);
      const stored = await dbSet(`blob:${id}`, file);
      if (!stored) {
        URL.revokeObjectURL(url);
        failed.push(file.name);
        continue;
      }
      blobUrls.current.set(id, url);
      added.push({
        id,
        title,
        artist,
        album: 'Local Files',
        artwork: makeCover(`${artist}|${title}`),
        duration,
        audioUrl: url,
        addedAt: Date.now(),
        source: 'local',
        mime: file.type || undefined,
      });
    }
    if (added.length) setLocal((prev) => [...added, ...prev]);
    return { added, failed };
  }, []);

  const removeLocalSong = useCallback((id: string) => {
    const url = blobUrls.current.get(id);
    if (url) URL.revokeObjectURL(url);
    blobUrls.current.delete(id);
    void dbDel(`blob:${id}`);
    setLocal((prev) => prev.filter((s) => s.id !== id));
    setLikedIds((prev) => prev.filter((x) => x !== id));
    setHistory((prev) => prev.filter((h) => h.id !== id));
    setPlaylists((prev) => prev.map((p) => (p.songIds.includes(id) ? { ...p, songIds: p.songIds.filter((s) => s !== id) } : p)));
  }, []);

  // ---- Recent searches ----
  const addRecentSearch = useCallback((q: string) => {
    const clean = q.trim();
    if (!clean) return;
    setRecentSearches((prev) => [clean, ...prev.filter((x) => x.toLowerCase() !== clean.toLowerCase())].slice(0, MAX_RECENT_SEARCHES));
  }, []);
  const removeRecentSearch = useCallback((q: string) => setRecentSearches((prev) => prev.filter((x) => x !== q)), []);
  const clearRecentSearches = useCallback(() => setRecentSearches([]), []);

  const resetAll = useCallback(async () => {
    blobUrls.current.forEach((u) => URL.revokeObjectURL(u));
    blobUrls.current.clear();
    await dbClear();
    setLocal([]);
    setPlaylists([]);
    setLikedIds([]);
    setHistory([]);
    setRecentSearches([]);
    toastSuccess('Library reset');
  }, []);

  useEffect(() => {
    const urls = blobUrls.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const value = useMemo<LibraryValue>(
    () => ({
      ...index,
      ready,
      songs,
      playlists,
      mixes,
      likedIds,
      likedSongs,
      history,
      recentSongs,
      recentSearches,
      isLiked,
      toggleLike,
      recordPlay,
      clearHistory,
      updateDuration,
      createPlaylist,
      renamePlaylist,
      deletePlaylist,
      addToPlaylist,
      removeFromPlaylist,
      reorderPlaylist,
      getPlaylist,
      resolve,
      addLocalFiles,
      removeLocalSong,
      localCount: local.length,
      addRecentSearch,
      removeRecentSearch,
      clearRecentSearches,
      resetAll,
    }),
    [
      index, ready, songs, playlists, mixes, likedIds, likedSongs, history, recentSongs, recentSearches, local.length,
      isLiked, toggleLike, recordPlay, clearHistory, updateDuration, createPlaylist, renamePlaylist, deletePlaylist,
      addToPlaylist, removeFromPlaylist, reorderPlaylist, getPlaylist, resolve, addLocalFiles, removeLocalSong,
      addRecentSearch, removeRecentSearch, clearRecentSearches, resetAll,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLibrary(): LibraryValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLibrary must be used inside <LibraryProvider>');
  return v;
}

export { toastError };
