import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { ACCENTS, DEFAULT_ACCENT, type AccentId } from '../config';
import { readString, writeString } from '../lib/storage';
import { toast, toastError, toastSuccess } from '../lib/toast';
import { pluralize } from '../lib/utils';
import type { Playlist, ThemeMode } from '../types';
import { useLibrary } from './LibraryContext';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

interface UIValue {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  accent: AccentId;
  setAccent: (a: AccentId) => void;

  fullScreenOpen: boolean;
  setFullScreenOpen: (v: boolean) => void;
  queueOpen: boolean;
  setQueueOpen: (v: boolean) => void;

  /** Dialog state, rendered by <Dialogs /> */
  createPlaylistFor: string[] | null;
  openCreatePlaylist: (songIds?: string[]) => void;
  closeCreatePlaylist: () => void;
  renameTarget: Playlist | null;
  openRenamePlaylist: (p: Playlist) => void;
  closeRenamePlaylist: () => void;
  addToPlaylistFor: string[] | null;
  openAddToPlaylist: (songIds: string[]) => void;
  closeAddToPlaylist: () => void;
  confirmState: ConfirmOptions | null;
  confirm: (o: ConfirmOptions) => void;
  closeConfirm: () => void;

  pickFiles: () => void;
}

const Ctx = createContext<UIValue | null>(null);

function readTheme(): ThemeMode {
  const t = readString('theme');
  return t === 'light' ? 'light' : 'dark';
}

function readAccent(): AccentId {
  const a = readString('accent');
  return (ACCENTS.find((x) => x.id === a)?.id ?? DEFAULT_ACCENT) as AccentId;
}

export function UIProvider({ children }: { children: ReactNode }) {
  const { addLocalFiles } = useLibrary();
  const [theme, setThemeState] = useState<ThemeMode>(readTheme);
  const [accent, setAccentState] = useState<AccentId>(readAccent);
  const [fullScreenOpen, setFullScreenOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [createPlaylistFor, setCreateFor] = useState<string[] | null>(null);
  const [renameTarget, setRenameTarget] = useState<Playlist | null>(null);
  const [addToPlaylistFor, setAddFor] = useState<string[] | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b0b12' : '#f6f6fb');
  }, [theme]);

  useEffect(() => {
    const preset = ACCENTS.find((a) => a.id === accent) ?? ACCENTS[0];
    const root = document.documentElement.style;
    root.setProperty('--brand', preset.brand);
    root.setProperty('--accent', preset.accent);
  }, [accent]);

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t);
    writeString('theme', t);
  }, []);
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      writeString('theme', next);
      return next;
    });
  }, []);
  const setAccent = useCallback((a: AccentId) => {
    setAccentState(a);
    writeString('accent', a);
  }, []);

  const pickFiles = useCallback(() => fileInput.current?.click(), []);

  const onFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // allow picking the same file again
    if (!files.length) return;
    toast(`Importing ${pluralize(files.length, 'file')}…`);
    try {
      const { added, failed } = await addLocalFiles(files);
      if (added.length) toastSuccess(`Added ${pluralize(added.length, 'song')} to your library`);
      if (failed.length) toastError(`Couldn't read ${failed.length > 2 ? `${failed.length} files` : failed.join(', ')} (unsupported or corrupted audio)`);
    } catch {
      toastError('Something went wrong while importing');
    }
  };

  const value = useMemo<UIValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      accent,
      setAccent,
      fullScreenOpen,
      setFullScreenOpen,
      queueOpen,
      setQueueOpen,
      createPlaylistFor,
      openCreatePlaylist: (ids = []) => setCreateFor(ids),
      closeCreatePlaylist: () => setCreateFor(null),
      renameTarget,
      openRenamePlaylist: (p) => setRenameTarget(p),
      closeRenamePlaylist: () => setRenameTarget(null),
      addToPlaylistFor,
      openAddToPlaylist: (ids) => setAddFor(ids),
      closeAddToPlaylist: () => setAddFor(null),
      confirmState,
      confirm: (o) => setConfirmState(o),
      closeConfirm: () => setConfirmState(null),
      pickFiles,
    }),
    [theme, setTheme, toggleTheme, accent, setAccent, fullScreenOpen, queueOpen, createPlaylistFor, renameTarget, addToPlaylistFor, confirmState, pickFiles],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <input ref={fileInput} type="file" accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.opus,.flac" multiple hidden onChange={onFiles} aria-hidden="true" tabIndex={-1} />
    </Ctx.Provider>
  );
}

export function useUI(): UIValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useUI must be used inside <UIProvider>');
  return v;
}
