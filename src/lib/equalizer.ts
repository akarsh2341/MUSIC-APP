import { useSyncExternalStore } from 'react';
import { readJSON, writeJSON } from './storage';

/* -------------------------------------------------------------------------------------------
 * 10-band equalizer built on the Web Audio API.
 *
 *   <audio> -> MediaElementSource -> preamp -> 10 biquad filters -> limiter -> speakers
 *
 * Browsers only allow Web Audio to process a *cross-origin* stream when the server sends CORS
 * headers. So for online tracks we load with crossOrigin="anonymous" while the EQ is in use,
 * and if the server refuses we fall back to normal playback (EQ unavailable for that server).
 * Uploaded files (blob: URLs) always work.
 * ----------------------------------------------------------------------------------------- */

export const EQ_FREQS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
export const EQ_LABELS = ['31', '62', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'];
export const EQ_RANGE = 12; // +/- dB

export const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Bass boost': [7, 6, 5, 3, 1, 0, 0, 0, 0, 0],
  'Treble boost': [0, 0, 0, 0, 0, 1, 3, 5, 6, 7],
  Vocal: [-3, -2, -1, 1, 3, 4, 3, 1, 0, -1],
  Rock: [5, 4, 2, -1, -2, -1, 2, 4, 5, 5],
  Pop: [-1, 1, 3, 4, 3, 0, -1, -1, 1, 2],
  Jazz: [3, 2, 1, 2, -2, -2, 0, 1, 2, 3],
  Classical: [4, 3, 2, 1, -1, -1, 0, 2, 3, 4],
  Electronic: [6, 5, 1, 0, -2, 2, 1, 2, 5, 6],
  'Hip hop': [6, 5, 2, 3, -1, -1, 2, 0, 2, 3],
  'Small speakers': [6, 5, 4, 2, 1, 0, -1, -2, -3, -3],
};

export interface EqState {
  enabled: boolean;
  preset: string; // a key of EQ_PRESETS, or 'Custom'
  gains: number[];
  /** true when the current online stream could not be processed (server blocks it) */
  unavailable: boolean;
}

interface Saved {
  enabled: boolean;
  preset: string;
  gains: number[];
}

function load(): EqState {
  const s = readJSON<Partial<Saved>>('eq', {});
  const gains =
    Array.isArray(s.gains) && s.gains.length === EQ_FREQS.length
      ? s.gains.map((g) => Math.max(-EQ_RANGE, Math.min(EQ_RANGE, Number(g) || 0)))
      : EQ_PRESETS.Flat.slice();
  return { enabled: !!s.enabled, preset: typeof s.preset === 'string' ? s.preset : 'Flat', gains, unavailable: false };
}

let state: EqState = load();
const listeners = new Set<() => void>();

function commit(next: EqState) {
  state = next;
  writeJSON('eq', { enabled: next.enabled, preset: next.preset, gains: next.gains } satisfies Saved);
  applyChain();
  listeners.forEach((l) => l());
}

export function subscribeEq(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
export const getEq = () => state;
export function useEqualizer(): EqState {
  return useSyncExternalStore(subscribeEq, getEq);
}

export function setEqEnabled(enabled: boolean) {
  commit({ ...state, enabled, unavailable: enabled ? state.unavailable : false });
  if (enabled) void ctx?.resume();
}
export function setEqPreset(name: string) {
  const g = EQ_PRESETS[name];
  if (!g) return;
  commit({ ...state, preset: name, gains: g.slice() });
}
export function setEqBand(index: number, gain: number) {
  const gains = state.gains.slice();
  gains[index] = Math.max(-EQ_RANGE, Math.min(EQ_RANGE, Math.round(gain * 2) / 2));
  const match = Object.entries(EQ_PRESETS).find(([, v]) => v.every((x, i) => x === gains[i]));
  commit({ ...state, gains, preset: match ? match[0] : 'Custom' });
}
export function resetEq() {
  commit({ ...state, preset: 'Flat', gains: EQ_PRESETS.Flat.slice() });
}
function setUnavailable(unavailable: boolean) {
  if (state.unavailable === unavailable) return;
  state = { ...state, unavailable };
  listeners.forEach((l) => l());
}

/* ---------------------------------- audio graph ---------------------------------- */
let ctx: AudioContext | null = null;
let pre: GainNode | null = null;
let filters: BiquadFilterNode[] = [];
const sources = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();

function ensureGraph(): boolean {
  if (ctx && pre) return true;
  try {
    const Ctor: typeof AudioContext | undefined = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return false;
    ctx = new Ctor();
    pre = ctx.createGain();
    filters = EQ_FREQS.map((f, i) => {
      const b = ctx!.createBiquadFilter();
      b.type = i === 0 ? 'lowshelf' : i === EQ_FREQS.length - 1 ? 'highshelf' : 'peaking';
      b.frequency.value = f;
      b.Q.value = 1.1;
      b.gain.value = 0;
      return b;
    });
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    let node: AudioNode = pre;
    filters.forEach((f) => {
      node.connect(f);
      node = f;
    });
    node.connect(limiter);
    limiter.connect(ctx.destination);
    applyChain();
    return true;
  } catch {
    ctx = null;
    pre = null;
    filters = [];
    return false;
  }
}

function applyChain() {
  if (!ctx || !pre) return;
  const t = ctx.currentTime;
  const gains = state.enabled ? state.gains : state.gains.map(() => 0);
  filters.forEach((f, i) => f.gain.setTargetAtTime(gains[i], t, 0.015));
  // Automatic headroom so boosted bands do not clip.
  const boost = Math.max(0, ...gains);
  pre.gain.setTargetAtTime(Math.pow(10, -boost / 20), t, 0.015);
}

/* ------------------------------ integration helpers ------------------------------ */
export function isRemote(url: string): boolean {
  if (!url || /^(blob|data):/i.test(url)) return false;
  try {
    return new URL(url, window.location.href).origin !== window.location.origin;
  } catch {
    return false;
  }
}
const originOf = (url: string) => {
  try {
    return new URL(url, window.location.href).origin;
  } catch {
    return url;
  }
};

const failedOrigins = new Set<string>();

export const isAttached = (a: HTMLAudioElement) => sources.has(a);

/** Decide how to load `url` into element `a`. */
export function planFor(a: HTMLAudioElement, url: string): 'cors' | 'plain' | 'swap-plain' {
  if (!isRemote(url)) return 'plain';
  const attached = isAttached(a);
  if (failedOrigins.has(originOf(url))) return attached ? 'swap-plain' : 'plain';
  return state.enabled || attached ? 'cors' : 'plain';
}

/** Call when an online track failed to load with CORS: remember it and report whether to retry. */
export function noteCorsFailure(a: HTMLAudioElement): boolean {
  const src = a.currentSrc || a.getAttribute('src') || '';
  if (a.crossOrigin !== 'anonymous' || !isRemote(src)) return false;
  failedOrigins.add(originOf(src));
  if (state.enabled) setUnavailable(true);
  return true;
}

/** Route this element through the equalizer if that is possible and wanted. */
export function connectIfPossible(a: HTMLAudioElement) {
  if (!state.enabled || isAttached(a)) return;
  const src = a.currentSrc || a.getAttribute('src') || '';
  if (!src) return;
  if (isRemote(src) && a.crossOrigin !== 'anonymous') return; // would be silenced by the browser
  if (!ensureGraph() || !ctx || !pre) return;
  try {
    const node = ctx.createMediaElementSource(a);
    node.connect(pre);
    sources.set(a, node);
    setUnavailable(false);
  } catch {
    /* already connected or unsupported */
  }
  void ctx.resume();
}

export function detach(a: HTMLAudioElement) {
  try {
    sources.get(a)?.disconnect();
  } catch {
    /* ignore */
  }
  sources.delete(a);
}

/** True when the element's current online stream was loaded without CORS and the EQ is now wanted. */
export function needsCorsReload(a: HTMLAudioElement): boolean {
  const src = a.currentSrc || a.getAttribute('src') || '';
  return state.enabled && !!src && isRemote(src) && a.crossOrigin !== 'anonymous' && !failedOrigins.has(originOf(src));
}
