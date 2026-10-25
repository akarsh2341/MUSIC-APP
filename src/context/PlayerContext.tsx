import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { RepeatMode, Song } from '../types';
import { readJSON, writeJSON } from '../lib/storage';
import { toast, toastError, toastSuccess } from '../lib/toast';
import { clamp, moveItem, shuffled } from '../lib/utils';
import { useLibrary } from './LibraryContext';
import { connectIfPossible, detach, getEq, needsCorsReload, noteCorsFailure, planFor, subscribeEq } from '../lib/equalizer';

/* -------------------------------------------------------------------------------------------
 * One <audio> element for the whole app. It lives at module scope (not in a component), so
 * navigating, re-rendering or opening the full-screen player can never create a second
 * playback instance or interrupt the current track.
 * ----------------------------------------------------------------------------------------- */
let audioEl: HTMLAudioElement | null = null;
function getAudio(): HTMLAudioElement {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = 'auto';
  }
  return audioEl;
}

/* Web Audio permanently takes over an <audio> element it is attached to. If an online track then
 * has to be played without CORS (so it cannot go through the equalizer), we swap in a fresh element. */
const audioSwapListeners = new Set<(oldEl: HTMLAudioElement, newEl: HTMLAudioElement) => void>();
function replaceAudio(): HTMLAudioElement {
  const old = getAudio();
  const fresh = new Audio();
  fresh.preload = 'auto';
  fresh.volume = old.volume;
  fresh.muted = old.muted;
  old.pause();
  old.removeAttribute('src');
  old.load();
  detach(old);
  audioEl = fresh;
  audioSwapListeners.forEach((l) => l(old, fresh));
  return fresh;
}

/* High-frequency playback position lives in its own tiny store so that only the seek bars
 * re-render 4x per second, not the whole component tree. */
const timeListeners = new Set<() => void>();
let timeValue = 0;
const timeStore = {
  get: () => timeValue,
  set: (t: number) => {
    if (t === timeValue) return;
    timeValue = t;
    timeListeners.forEach((l) => l());
  },
  subscribe: (cb: () => void) => {
    timeListeners.add(cb);
    return () => {
      timeListeners.delete(cb);
    };
  },
};
export function useCurrentTime(): number {
  return useSyncExternalStore(timeStore.subscribe, timeStore.get);
}

interface Core {
  queue: Song[];
  /** Pre-shuffle order, so turning shuffle off restores the original order. */
  original: Song[] | null;
  index: number;
  shuffle: boolean;
  repeat: RepeatMode;
}

interface PlayerState extends Core {
  current: Song | null;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  duration: number;
  volume: number;
  muted: boolean;
}

interface PlayerActions {
  playSong: (song: Song, context?: Song[]) => void;
  playList: (songs: Song[], opts?: { startIndex?: number; shuffle?: boolean }) => void;
  toggle: () => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  seekBy: (delta: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (songs: Song | Song[]) => void;
  playNext: (songs: Song | Song[]) => void;
  removeFromQueue: (index: number) => void;
  moveInQueue: (from: number, to: number) => void;
  clearQueue: () => void;
  jumpTo: (index: number) => void;
  retry: () => void;
}

const StateCtx = createContext<PlayerState | null>(null);
const ActionsCtx = createContext<PlayerActions | null>(null);

interface SavedSession {
  ids: string[];
  index: number;
  time: number;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { ready, songById, recordPlay, updateDuration } = useLibrary();

  const [core, setCoreState] = useState<Core>(() => ({
    queue: [],
    original: null,
    index: -1,
    shuffle: readJSON<boolean>('shuffle', false),
    repeat: readJSON<RepeatMode>('repeat', 'off'),
  }));
  const coreRef = useRef(core);
  const setCore = useCallback((patch: Partial<Core>) => {
    coreRef.current = { ...coreRef.current, ...patch };
    setCoreState(coreRef.current);
  }, []);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(() => clamp(readJSON<number>('volume', 0.8), 0, 1));
  const [muted, setMuted] = useState(() => readJSON<boolean>('muted', false));

  const volRef = useRef(volume);
  const fadeRaf = useRef(0);
  const fadePending = useRef(false);
  const pendingSeek = useRef(0);
  const failStreak = useRef(0);
  const recordedFor = useRef<string | null>(null);
  const lastPersist = useRef(0);
  const lastPosition = useRef(0);
  const restored = useRef(false);

  const latest = useRef({ recordPlay, updateDuration });
  latest.current = { recordPlay, updateDuration };

  const current = core.index >= 0 ? core.queue[core.index] ?? null : null;

  /* ---------------- session persistence ---------------- */
  const persistSession = useCallback(() => {
    const { queue, index } = coreRef.current;
    if (!queue.length || index < 0) return;
    const session: SavedSession = { ids: queue.map((s) => s.id), index, time: getAudio().currentTime || 0 };
    writeJSON('session', session);
    lastPersist.current = Date.now();
  }, []);

  /* ---------------- low-level audio helpers ---------------- */
  const cancelFade = useCallback(() => {
    if (fadeRaf.current) cancelAnimationFrame(fadeRaf.current);
    fadeRaf.current = 0;
  }, []);

  const fadeIn = useCallback(() => {
    const a = getAudio();
    cancelFade();
    // rAF is paused in background tabs, which would leave the track silent - skip the fade there.
    if (document.hidden) {
      a.volume = volRef.current;
      return;
    }
    const start = performance.now();
    const DURATION = 350;
    a.volume = 0;
    const step = (now: number) => {
      const p = Math.max(0, Math.min(1, (now - start) / DURATION));
      a.volume = volRef.current * p;
      fadeRaf.current = p < 1 ? requestAnimationFrame(step) : 0;
    };
    fadeRaf.current = requestAnimationFrame(step);
  }, [cancelFade]);

  const safePlay = useCallback(() => {
    const a = getAudio();
    const p = a.play();
    if (p && typeof p.catch === 'function') {
      p.catch((err: unknown) => {
        const name = (err as { name?: string })?.name;
        if (name === 'NotAllowedError') {
          setIsPlaying(false);
          setIsLoading(false);
          toast('Press play to start playback');
        }
        // AbortError = interrupted by a newer load (expected); other failures arrive via the `error` event.
      });
    }
  }, []);

  const startTrack = useCallback(
    (song: Song, autoplay: boolean, seekTo = 0) => {
      let a = getAudio();
      const plan = planFor(a, song.audioUrl);
      if (plan === 'swap-plain') a = replaceAudio();
      if (plan === 'cors') a.crossOrigin = 'anonymous';
      else a.removeAttribute('crossorigin');
      cancelFade();
      pendingSeek.current = seekTo;
      fadePending.current = autoplay;
      recordedFor.current = null;
      setError(null);
      setIsLoading(autoplay);
      setDuration(song.duration);
      timeStore.set(seekTo);
      if (!autoplay) {
        a.pause();
        setIsPlaying(false);
      }
      a.volume = volRef.current;
      a.src = song.audioUrl;
      a.load();
      if (autoplay) safePlay();
    },
    [cancelFade, safePlay],
  );

  const stopPlayback = useCallback(() => {
    const a = getAudio();
    cancelFade();
    a.pause();
    a.removeAttribute('src');
    a.load();
    setIsPlaying(false);
    setIsLoading(false);
    setError(null);
    setDuration(0);
    timeStore.set(0);
  }, [cancelFade]);

  const goTo = useCallback(
    (index: number, autoplay: boolean) => {
      const song = coreRef.current.queue[index];
      if (!song) return;
      setCore({ index });
      startTrack(song, autoplay);
    },
    [setCore, startTrack],
  );

  /** Moves forward. `auto` = the previous track ended by itself (vs. the user pressing Next). */
  const advance = useCallback(
    (auto: boolean) => {
      const { queue, index, repeat } = coreRef.current;
      if (!queue.length) return;
      const a = getAudio();
      let ni = index + 1;
      if (ni >= queue.length) {
        if (repeat === 'all') ni = 0;
        else {
          if (auto) {
            a.pause();
            a.currentTime = 0;
            timeStore.set(0);
            setIsPlaying(false);
          } else {
            toast('You have reached the end of the queue');
          }
          return;
        }
      }
      if (ni === index) {
        // single-track queue on repeat-all
        a.currentTime = 0;
        safePlay();
        return;
      }
      goTo(ni, true);
    },
    [goTo, safePlay],
  );

  /* ---------------- audio element events (registered once) ---------------- */
  useEffect(() => {
    let a = getAudio();
    a.volume = volRef.current;
    a.muted = muted;

    const songNow = () => coreRef.current.queue[coreRef.current.index] ?? null;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => {
      if (!a.ended) setIsPlaying(false);
      persistSession();
    };
    const onWaiting = () => {
      if (!a.paused) setIsLoading(true);
    };
    const onCanPlay = () => setIsLoading(false);
    const onPlaying = () => {
      connectIfPossible(a);
      setIsPlaying(true);
      setIsLoading(false);
      setError(null);
      failStreak.current = 0;
      if (fadePending.current) {
        fadePending.current = false;
        fadeIn();
      }
      const s = songNow();
      if (s && recordedFor.current !== s.id) {
        recordedFor.current = s.id;
        latest.current.recordPlay(s.id);
      }
    };
    const onLoadedMeta = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) {
        setDuration(a.duration);
        const s = songNow();
        if (s) latest.current.updateDuration(s.id, a.duration);
      }
      if (pendingSeek.current > 0) {
        try {
          a.currentTime = pendingSeek.current;
        } catch {
          /* ignore */
        }
        pendingSeek.current = 0;
      }
    };
    const onDurationChange = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) setDuration(a.duration);
    };
    const onTimeUpdate = () => {
      timeStore.set(a.currentTime);
      lastPosition.current = a.currentTime;
      if (Date.now() - lastPersist.current > 5000) persistSession();
      if ('mediaSession' in navigator && Number.isFinite(a.duration) && a.duration > 0) {
        try {
          navigator.mediaSession.setPositionState({ duration: a.duration, playbackRate: a.playbackRate, position: Math.min(a.currentTime, a.duration) });
        } catch {
          /* unsupported */
        }
      }
    };
    const onEnded = () => {
      const { repeat } = coreRef.current;
      if (repeat === 'one') {
        a.currentTime = 0;
        recordedFor.current = null;
        safePlay();
      } else {
        advance(true);
      }
    };
    const onError = () => {
      if (!a.getAttribute('src')) return; // we cleared it ourselves
      const song = songNow();
      // Online server refused CORS (needed by the equalizer): retry the same track as plain playback.
      if (song && noteCorsFailure(a)) {
        const resume = fadePending.current || !a.paused;
        startTrack(song, resume, a.currentTime || 0);
        return;
      }
      const unsupported = a.error?.code === 4;
      setIsLoading(false);
      setIsPlaying(false);
      setError(unsupported ? 'This audio is unavailable or in an unsupported format.' : 'Playback failed. Check your connection and try again.');
      if (!song) return;
      toastError(`Couldn't play "${song.title}"`);
      failStreak.current += 1;
      const { queue, index } = coreRef.current;
      // Skip over broken tracks automatically, but stop if everything seems to be failing.
      if (index < queue.length - 1 && failStreak.current < Math.min(queue.length, 5)) {
        const failedIndex = index;
        window.setTimeout(() => {
          if (coreRef.current.index === failedIndex && getAudio().error) advance(false);
        }, 1400);
      }
    };

    const handlers: Array<[string, EventListener]> = [
      ['play', onPlay],
      ['pause', onPause],
      ['waiting', onWaiting],
      ['canplay', onCanPlay],
      ['playing', onPlaying],
      ['loadedmetadata', onLoadedMeta],
      ['durationchange', onDurationChange],
      ['timeupdate', onTimeUpdate],
      ['ended', onEnded],
      ['error', onError],
    ];
    handlers.forEach(([evt, fn]) => a.addEventListener(evt, fn));
    const onSwap = (oldEl: HTMLAudioElement, newEl: HTMLAudioElement) => {
      handlers.forEach(([evt, fn]) => {
        oldEl.removeEventListener(evt, fn);
        newEl.addEventListener(evt, fn);
      });
      a = newEl;
    };
    audioSwapListeners.add(onSwap);
    // Equalizer switched on while an online track is already playing: reload it with CORS so it can be processed.
    const unsubEq = subscribeEq(() => {
      if (!getEq().enabled) return;
      const cur = getAudio();
      const song = songNow();
      if (song && needsCorsReload(cur)) startTrack(song, !cur.paused, cur.currentTime || 0);
      else connectIfPossible(cur);
    });
    const onUnload = () => persistSession();
    window.addEventListener('pagehide', onUnload);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      handlers.forEach(([evt, fn]) => a.removeEventListener(evt, fn));
      audioSwapListeners.delete(onSwap);
      unsubEq();
      window.removeEventListener('pagehide', onUnload);
      window.removeEventListener('beforeunload', onUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- restore last session (paused) once the library has loaded ---------------- */
  useEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true;
    if (coreRef.current.queue.length) return; // user already started something
    const saved = readJSON<SavedSession | null>('session', null);
    if (!saved || !Array.isArray(saved.ids)) return;
    const queue = saved.ids.map((id) => songById.get(id)).filter((s): s is Song => !!s);
    if (!queue.length) return;
    const wanted = saved.ids[saved.index];
    const idx = Math.max(0, queue.findIndex((s) => s.id === wanted));
    setCore({ queue, original: null, index: idx });
    startTrack(queue[idx], false, saved.time > 1 ? saved.time : 0);
  }, [ready, songById, setCore, startTrack]);

  // Persist the queue whenever it changes.
  useEffect(() => {
    if (core.queue.length) persistSession();
  }, [core.queue, core.index, persistSession]);

  /* Drop uploaded songs from the queue if the user removes them from the library. */
  useEffect(() => {
    const c = coreRef.current;
    if (!c.queue.some((s) => s.source === 'local' && !songById.has(s.id))) return;
    const keep = (s: Song) => s.source !== 'local' || songById.has(s.id);
    const curId = c.queue[c.index]?.id;
    const queue = c.queue.filter(keep);
    const original = c.original ? c.original.filter(keep) : null;
    if (!queue.length) {
      setCore({ queue: [], original: null, index: -1 });
      stopPlayback();
      return;
    }
    if (curId && queue.some((s) => s.id === curId)) {
      setCore({ queue, original, index: queue.findIndex((s) => s.id === curId) });
    } else {
      const wasPlaying = !getAudio().paused;
      const index = Math.min(c.index, queue.length - 1);
      setCore({ queue, original, index });
      startTrack(queue[index], wasPlaying);
    }
  }, [songById, setCore, startTrack, stopPlayback]);

  /* ---------------- public actions ---------------- */
  const actions = useMemo<PlayerActions>(() => {
    const toArray = (s: Song | Song[]) => (Array.isArray(s) ? s : [s]);

    const playList: PlayerActions['playList'] = (songs, opts = {}) => {
      if (!songs.length) return;
      const shuffleOn = opts.shuffle ?? coreRef.current.shuffle;
      let start = opts.startIndex ?? 0;
      if (opts.shuffle === true && opts.startIndex === undefined) start = Math.floor(Math.random() * songs.length);
      start = clamp(start, 0, songs.length - 1);
      if (shuffleOn) {
        const first = songs[start];
        const rest = shuffled(songs.filter((_, i) => i !== start));
        setCore({ queue: [first, ...rest], original: songs.slice(), index: 0, shuffle: true });
      } else {
        setCore({ queue: songs.slice(), original: null, index: start, shuffle: false });
      }
      if (shuffleOn !== readJSON<boolean>('shuffle', false)) writeJSON('shuffle', shuffleOn);
      startTrack(coreRef.current.queue[coreRef.current.index], true);
    };

    const toggle = () => {
      const a = getAudio();
      const { queue, index } = coreRef.current;
      const song = queue[index];
      if (!song) return;
      if (a.error || !a.getAttribute('src')) {
        startTrack(song, true, a.currentTime || 0);
      } else if (a.paused) {
        safePlay();
      } else {
        a.pause();
      }
    };

    return {
      playList,

      playSong: (song, context) => {
        const { queue, index } = coreRef.current;
        if (queue[index]?.id === song.id) {
          toggle();
          return;
        }
        const list = context && context.some((s) => s.id === song.id) ? context : [song];
        playList(list, { startIndex: list.findIndex((s) => s.id === song.id) });
      },

      toggle,

      pause: () => getAudio().pause(),

      next: () => advance(false),

      prev: () => {
        const a = getAudio();
        const { index, queue, repeat } = coreRef.current;
        if (!queue.length) return;
        if (a.currentTime > 3 || (index === 0 && repeat !== 'all')) {
          a.currentTime = 0;
          timeStore.set(0);
          return;
        }
        goTo(index === 0 ? queue.length - 1 : index - 1, true);
      },

      seek: (seconds) => {
        const a = getAudio();
        if (!coreRef.current.queue.length) return;
        const max = Number.isFinite(a.duration) ? a.duration : seconds;
        const t = clamp(seconds, 0, max);
        a.currentTime = t;
        timeStore.set(t);
      },

      seekBy: (delta) => {
        const a = getAudio();
        if (!coreRef.current.queue.length) return;
        const max = Number.isFinite(a.duration) ? a.duration : a.currentTime + delta;
        const t = clamp(a.currentTime + delta, 0, max);
        a.currentTime = t;
        timeStore.set(t);
      },

      setVolume: (v) => {
        const a = getAudio();
        const nv = clamp(v, 0, 1);
        cancelFade();
        volRef.current = nv;
        a.volume = nv;
        setVolumeState(nv);
        writeJSON('volume', nv);
        if (nv > 0 && a.muted) {
          a.muted = false;
          setMuted(false);
          writeJSON('muted', false);
        }
      },

      toggleMute: () => {
        const a = getAudio();
        const nm = !a.muted;
        a.muted = nm;
        if (!nm && volRef.current === 0) {
          volRef.current = 0.5;
          a.volume = 0.5;
          setVolumeState(0.5);
        }
        setMuted(nm);
        writeJSON('muted', nm);
      },

      toggleShuffle: () => {
        const c = coreRef.current;
        const cur = c.queue[c.index];
        if (!c.shuffle) {
          if (cur) {
            const rest = shuffled(c.queue.filter((_, i) => i !== c.index));
            setCore({ shuffle: true, original: c.queue.slice(), queue: [cur, ...rest], index: 0 });
          } else setCore({ shuffle: true });
          toast('Shuffle on');
        } else {
          if (c.original && cur) {
            const idx = c.original.findIndex((s) => s.id === cur.id);
            setCore({ shuffle: false, queue: c.original, original: null, index: Math.max(0, idx) });
          } else setCore({ shuffle: false, original: null });
          toast('Shuffle off');
        }
        writeJSON('shuffle', coreRef.current.shuffle);
      },

      cycleRepeat: () => {
        const order: RepeatMode[] = ['off', 'all', 'one'];
        const next = order[(order.indexOf(coreRef.current.repeat) + 1) % order.length];
        setCore({ repeat: next });
        writeJSON('repeat', next);
        toast(next === 'off' ? 'Repeat off' : next === 'all' ? 'Repeat all' : 'Repeat one');
      },

      addToQueue: (songs) => {
        const list = toArray(songs);
        if (!list.length) return;
        const c = coreRef.current;
        if (!c.queue.length) {
          playList(list);
          return;
        }
        setCore({ queue: [...c.queue, ...list], original: c.original ? [...c.original, ...list] : null });
        toastSuccess(list.length === 1 ? `Added "${list[0].title}" to queue` : `Added ${list.length} songs to queue`);
      },

      playNext: (songs) => {
        const list = toArray(songs);
        if (!list.length) return;
        const c = coreRef.current;
        if (!c.queue.length) {
          playList(list);
          return;
        }
        const queue = c.queue.slice();
        queue.splice(c.index + 1, 0, ...list);
        setCore({ queue, original: c.original ? [...c.original, ...list] : null });
        toastSuccess(list.length === 1 ? `"${list[0].title}" will play next` : `${list.length} songs will play next`);
      },

      removeFromQueue: (i) => {
        const c = coreRef.current;
        if (i < 0 || i >= c.queue.length) return;
        const removed = c.queue[i];
        const queue = c.queue.filter((_, k) => k !== i);
        let original = c.original;
        if (original) {
          const oi = original.findIndex((s) => s.id === removed.id);
          if (oi >= 0) original = original.filter((_, k) => k !== oi);
        }
        if (!queue.length) {
          setCore({ queue: [], original: null, index: -1 });
          stopPlayback();
          return;
        }
        if (i === c.index) {
          const wasPlaying = !getAudio().paused;
          const index = Math.min(i, queue.length - 1);
          setCore({ queue, original, index });
          startTrack(queue[index], wasPlaying);
        } else {
          setCore({ queue, original, index: i < c.index ? c.index - 1 : c.index });
        }
      },

      moveInQueue: (from, to) => {
        const c = coreRef.current;
        if (from === to || from < 0 || to < 0 || from >= c.queue.length || to >= c.queue.length) return;
        let index = c.index;
        if (from === index) index = to;
        else if (from < index && to >= index) index -= 1;
        else if (from > index && to <= index) index += 1;
        setCore({ queue: moveItem(c.queue, from, to), index });
      },

      clearQueue: () => {
        const c = coreRef.current;
        const cur = c.queue[c.index];
        if (!cur) return;
        setCore({ queue: [cur], original: c.original ? [cur] : null, index: 0 });
        toast('Queue cleared');
      },

      jumpTo: (i) => goTo(i, true),

      retry: () => {
        const c = coreRef.current;
        const song = c.queue[c.index];
        if (song) startTrack(song, true, lastPosition.current);
      },
    };
  }, [advance, cancelFade, goTo, safePlay, setCore, startTrack, stopPlayback]);

  /* ---------------- Media Session (lock screen / hardware keys / background playback) ---------------- */
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    const set = (action: MediaSessionAction, fn: MediaSessionActionHandler) => {
      try {
        ms.setActionHandler(action, fn);
      } catch {
        /* action unsupported */
      }
    };
    set('play', () => safePlay());
    set('pause', () => getAudio().pause());
    set('previoustrack', () => actions.prev());
    set('nexttrack', () => actions.next());
    set('seekbackward', (d) => actions.seekBy(-(d.seekOffset || 10)));
    set('seekforward', (d) => actions.seekBy(d.seekOffset || 10));
    set('seekto', (d) => {
      if (typeof d.seekTime === 'number') actions.seek(d.seekTime);
    });
  }, [actions, safePlay]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (!current) {
      navigator.mediaSession.metadata = null;
      return;
    }
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: current.title,
        artist: current.artist,
        album: current.album,
        artwork: [{ src: current.artwork, sizes: '600x600', type: current.artwork.startsWith('data:image/svg') ? 'image/svg+xml' : undefined }],
      });
    } catch {
      /* ignore */
    }
  }, [current]);

  useEffect(() => {
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = current ? (isPlaying ? 'playing' : 'paused') : 'none';
  }, [isPlaying, current]);

  const state = useMemo<PlayerState>(
    () => ({ ...core, current, isPlaying, isLoading, error, duration, volume, muted }),
    [core, current, isPlaying, isLoading, error, duration, volume, muted],
  );

  return (
    <ActionsCtx.Provider value={actions}>
      <StateCtx.Provider value={state}>{children}</StateCtx.Provider>
    </ActionsCtx.Provider>
  );
}

export function usePlayerState(): PlayerState {
  const v = useContext(StateCtx);
  if (!v) throw new Error('usePlayerState must be used inside <PlayerProvider>');
  return v;
}

export function usePlayerActions(): PlayerActions {
  const v = useContext(ActionsCtx);
  if (!v) throw new Error('usePlayerActions must be used inside <PlayerProvider>');
  return v;
}

/** State + actions in one object. */
export function usePlayer(): PlayerState & PlayerActions {
  const s = usePlayerState();
  const a = usePlayerActions();
  return useMemo(() => ({ ...s, ...a }), [s, a]);
}
