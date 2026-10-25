import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Plus } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { useUI } from '../context/UIContext';
import { toast, toastSuccess } from '../lib/toast';
import { pluralize } from '../lib/utils';
import { Modal } from './Modal';
import { PlaylistArt } from './Cards';

const MAX_NAME = 60;

function NameForm({ initial, submitLabel, onSubmit, onCancel, hint }: { initial: string; submitLabel: string; onSubmit: (name: string) => void; onCancel: () => void; hint?: string }) {
  const [name, setName] = useState(initial);
  const valid = name.trim().length > 0;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (valid) onSubmit(name.trim());
  };
  return (
    <form onSubmit={submit}>
      <label htmlFor="playlist-name" className="mb-1.5 block text-sm font-medium text-muted">
        Playlist name
      </label>
      <input id="playlist-name" data-autofocus className="input" value={name} maxLength={MAX_NAME} placeholder="My awesome playlist" onChange={(e) => setName(e.target.value)} onFocus={(e) => e.currentTarget.select()} />
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
      <div className="mt-5 flex justify-end gap-2 pb-5">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={!valid}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

export function Dialogs() {
  const ui = useUI();
  const lib = useLibrary();
  const navigate = useNavigate();

  const addIds = ui.addToPlaylistFor;

  return (
    <>
      {/* Create */}
      <Modal open={ui.createPlaylistFor !== null} onClose={ui.closeCreatePlaylist} title="Create playlist">
        {ui.createPlaylistFor !== null && (
          <NameForm
            initial=""
            submitLabel="Create"
            hint={ui.createPlaylistFor.length ? `${pluralize(ui.createPlaylistFor.length, 'song')} will be added.` : undefined}
            onCancel={ui.closeCreatePlaylist}
            onSubmit={(name) => {
              const pl = lib.createPlaylist(name, ui.createPlaylistFor ?? []);
              ui.closeCreatePlaylist();
              ui.closeAddToPlaylist();
              toastSuccess(`Created "${pl.name}"`, { label: 'Open', onClick: () => navigate(`/playlist/${pl.id}`) });
            }}
          />
        )}
      </Modal>

      {/* Rename */}
      <Modal open={!!ui.renameTarget} onClose={ui.closeRenamePlaylist} title="Rename playlist">
        {ui.renameTarget && (
          <NameForm
            initial={ui.renameTarget.name}
            submitLabel="Save"
            onCancel={ui.closeRenamePlaylist}
            onSubmit={(name) => {
              if (ui.renameTarget) lib.renamePlaylist(ui.renameTarget.id, name);
              ui.closeRenamePlaylist();
              toast('Playlist renamed');
            }}
          />
        )}
      </Modal>

      {/* Add to playlist */}
      <Modal open={addIds !== null} onClose={ui.closeAddToPlaylist} title="Add to playlist">
        {addIds !== null && (
          <div className="pb-4">
            <button
              className="mb-2 flex w-full items-center gap-3 rounded-xl p-2 text-left font-semibold transition hover:bg-line/10"
              onClick={() => ui.openCreatePlaylist(addIds)}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand/15 text-brand">
                <Plus className="h-6 w-6" />
              </span>
              New playlist
            </button>
            {lib.playlists.length === 0 && <p className="px-2 py-4 text-sm text-muted">You don&apos;t have any playlists yet. Create one to get started.</p>}
            <ul className="space-y-0.5">
              {lib.playlists.map((p) => {
                const all = addIds.length > 0 && addIds.every((id) => p.songIds.includes(id));
                return (
                  <li key={p.id}>
                    <button
                      className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-line/10 disabled:opacity-60"
                      disabled={all}
                      onClick={() => {
                        const n = lib.addToPlaylist(p.id, addIds);
                        ui.closeAddToPlaylist();
                        if (n === 0) toast(`Already in "${p.name}"`);
                        else toastSuccess(`Added ${pluralize(n, 'song')} to "${p.name}"`);
                      }}
                    >
                      <PlaylistArt playlist={p} className="h-12 w-12 shrink-0 !rounded-lg" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{p.name}</span>
                        <span className="block text-xs text-muted">{pluralize(p.songIds.length, 'song')}</span>
                      </span>
                      {all && (
                        <span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
                          <Check className="h-4 w-4" /> Added
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Modal>

      {/* Confirm */}
      <Modal
        open={!!ui.confirmState}
        onClose={ui.closeConfirm}
        title={ui.confirmState?.title ?? ''}
        footer={
          <>
            <button className="btn-ghost" onClick={ui.closeConfirm}>
              Cancel
            </button>
            <button
              className={ui.confirmState?.danger ? 'btn-danger' : 'btn-primary'}
              data-autofocus
              onClick={() => {
                const fn = ui.confirmState?.onConfirm;
                ui.closeConfirm();
                fn?.();
              }}
            >
              {ui.confirmState?.confirmLabel ?? 'Confirm'}
            </button>
          </>
        }
      >
        <p className="text-sm text-muted">{ui.confirmState?.message}</p>
      </Modal>

      {/* Keyboard shortcuts */}
      <Modal open={ui.shortcutsOpen} onClose={() => ui.setShortcutsOpen(false)} title="Keyboard shortcuts" className="max-w-lg">
        <ShortcutList />
      </Modal>
    </>
  );
}

export const SHORTCUTS: Array<[string, string]> = [
  ['Space  or  K', 'Play / pause'],
  ['→  /  ←', 'Seek forward / back 5 seconds'],
  ['Shift + →  /  Shift + ←', 'Next / previous track  (also N / P)'],
  ['↑  /  ↓', 'Volume up / down'],
  ['M', 'Mute / unmute'],
  ['S', 'Toggle shuffle'],
  ['R', 'Cycle repeat mode'],
  ['L', 'Like the current song'],
  ['Q', 'Open / close the queue'],
  ['F', 'Open / close the full-screen player'],
  ['/', 'Focus search'],
  ['?', 'Show this help'],
  ['Esc', 'Close the topmost panel'],
];

export function ShortcutList() {
  return (
    <dl className="divide-y divide-line/10 pb-4 text-sm">
      {SHORTCUTS.map(([keys, label]) => (
        <div key={keys} className="flex items-center justify-between gap-4 py-2.5">
          <dt className="text-muted">{label}</dt>
          <dd className="shrink-0 rounded-md border border-line/15 bg-elevated px-2 py-0.5 font-mono text-xs">{keys}</dd>
        </div>
      ))}
    </dl>
  );
}
