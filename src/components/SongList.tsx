import { ArrowDownUp, Play, Shuffle } from 'lucide-react';
import type { ReactNode } from 'react';
import { usePlayerActions } from '../context/PlayerContext';
import { useReorder } from '../lib/useReorder';
import { cn } from '../lib/utils';
import type { Song, SortKey } from '../types';
import type { MenuItem } from './MenuButton';
import { SongListHeader, SongRow } from './SongRow';

export function SongList({
  songs,
  showAlbum = true,
  extraMenuFor,
  onMove,
}: {
  songs: Song[];
  showAlbum?: boolean;
  extraMenuFor?: (song: Song, index: number) => MenuItem[];
  /** When provided, rows can be reordered by drag-and-drop or the Move up / Move down menu items. */
  onMove?: (from: number, to: number) => void;
}) {
  const { propsFor, dragIndex, overIndex } = useReorder(onMove ?? (() => undefined));
  return (
    <div role="list" aria-label="Songs">
      <SongListHeader showAlbum={showAlbum} />
      {songs.map((s, i) => (
        <div role="listitem" key={s.id}>
          <SongRow
            song={s}
            index={i}
            list={songs}
            showAlbum={showAlbum}
            extraMenu={extraMenuFor?.(s, i)}
            reorder={onMove ? { index: i, count: songs.length, onMove, dndProps: propsFor(i) as Record<string, unknown>, isDragging: dragIndex === i, isOver: overIndex === i } : undefined}
          />
        </div>
      ))}
    </div>
  );
}

export function PlayShuffleButtons({ songs, className }: { songs: Song[]; className?: string }) {
  const { playList } = usePlayerActions();
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button className="btn-primary !px-6 !py-3" disabled={!songs.length} onClick={() => playList(songs, { shuffle: false })}>
        <Play className="h-5 w-5 fill-current" /> Play
      </button>
      <button className="btn-ghost !px-5 !py-3" disabled={!songs.length} onClick={() => playList(songs, { shuffle: true })}>
        <Shuffle className="h-5 w-5" /> Shuffle
      </button>
    </div>
  );
}

export type SortValue = SortKey | 'custom';

export function SortSelect({ value, onChange, allowCustom, customLabel = 'Custom order' }: { value: SortValue; onChange: (v: SortValue) => void; allowCustom?: boolean; customLabel?: string }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-muted">
      <ArrowDownUp className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only md:not-sr-only">Sort by</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortValue)}
        className="rounded-full border border-line/15 bg-elevated px-3 py-1.5 text-sm font-medium text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      >
        {allowCustom && <option value="custom">{customLabel}</option>}
        <option value="recent">Recently added</option>
        <option value="title">Title</option>
        <option value="artist">Artist</option>
      </select>
    </label>
  );
}

/** Large page header used by album, artist and playlist pages. */
export function CollectionHeader({ art, kind, title, meta, actions, round }: { art: ReactNode; kind: string; title: string; meta?: ReactNode; actions?: ReactNode; round?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-5 pb-6 pt-2 text-center sm:flex-row sm:items-end sm:text-left">
      <div className={cn('w-44 shrink-0 shadow-2xl shadow-black/50 sm:w-52 lg:w-60 [&>*]:w-full', round ? 'overflow-hidden rounded-full' : 'overflow-hidden rounded-2xl')}>{art}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-widest text-muted">{kind}</p>
        <h1 className="mt-1 break-words text-3xl font-extrabold tracking-tight md:text-5xl">{title}</h1>
        {meta && <div className="mt-2 text-sm text-muted">{meta}</div>}
        {actions && <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:justify-start">{actions}</div>}
      </div>
    </div>
  );
}
