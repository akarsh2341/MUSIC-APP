import { memo, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, Disc3, GripVertical, Heart, ListEnd, ListPlus, ListStart, Pause, Play, Trash2, User } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { usePlayerActions, usePlayerState } from '../context/PlayerContext';
import { useUI } from '../context/UIContext';
import { albumIdOf, artistIdOf } from '../lib/library';
import { cn, formatTime } from '../lib/utils';
import type { Song } from '../types';
import { MenuButton, type MenuItem } from './MenuButton';
import { Cover, EqBars } from './ui';

/** Builds the standard context-menu entries for a song. */
export function useSongMenu(song: Song, extra: MenuItem[] = []): MenuItem[] {
  const navigate = useNavigate();
  const { isLiked, toggleLike, removeLocalSong } = useLibrary();
  const { playNext, addToQueue } = usePlayerActions();
  const { openAddToPlaylist, confirm } = useUI();
  const liked = isLiked(song.id);

  return [
    { label: 'Play next', icon: <ListStart />, onClick: () => playNext(song) },
    { label: 'Add to queue', icon: <ListEnd />, onClick: () => addToQueue(song) },
    { label: 'Add to playlist…', icon: <ListPlus />, onClick: () => openAddToPlaylist([song.id]) },
    { label: liked ? 'Remove from Liked Songs' : 'Add to Liked Songs', icon: <Heart className={liked ? 'fill-current' : ''} />, onClick: () => toggleLike(song.id) },
    { label: 'Go to album', icon: <Disc3 />, onClick: () => navigate(`/album/${albumIdOf(song)}`), separatorBefore: true },
    { label: 'Go to artist', icon: <User />, onClick: () => navigate(`/artist/${artistIdOf(song)}`) },
    ...extra.map((e, i) => (i === 0 ? { ...e, separatorBefore: true } : e)),
    {
      label: 'Delete from device library',
      icon: <Trash2 />,
      danger: true,
      hidden: song.source !== 'local',
      separatorBefore: true,
      onClick: () =>
        confirm({
          title: 'Delete this file?',
          message: `"${song.title}" will be removed from your VibePlay library (the original file on your device is not touched).`,
          confirmLabel: 'Delete',
          danger: true,
          onConfirm: () => removeLocalSong(song.id),
        }),
    },
  ];
}

export interface RowReorder {
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  dndProps: Record<string, unknown>;
  isDragging: boolean;
  isOver: boolean;
}

interface Props {
  song: Song;
  index: number;
  /** The list this row belongs to - playing the row queues the whole list. */
  list: Song[];
  showAlbum?: boolean;
  showIndex?: boolean;
  extraMenu?: MenuItem[];
  reorder?: RowReorder;
  /** Override "is this the current track" (queue rows can contain duplicates). */
  isCurrentOverride?: boolean;
  onPlayOverride?: () => void;
}

export const SongRow = memo(function SongRow({ song, index, list, showAlbum = true, showIndex = true, extraMenu = [], reorder, isCurrentOverride, onPlayOverride }: Props) {
  const { current, isPlaying } = usePlayerState();
  const { playSong, toggle } = usePlayerActions();
  const { isLiked, toggleLike } = useLibrary();
  const isCurrent = isCurrentOverride ?? current?.id === song.id;
  const playingNow = isCurrent && isPlaying;
  const liked = isLiked(song.id);

  const reorderItems = useMemo<MenuItem[]>(() => {
    if (!reorder) return [];
    return [
      { label: 'Move up', icon: <ArrowUp />, disabled: reorder.index === 0, onClick: () => reorder.onMove(reorder.index, reorder.index - 1) },
      { label: 'Move down', icon: <ArrowDown />, disabled: reorder.index >= reorder.count - 1, onClick: () => reorder.onMove(reorder.index, reorder.index + 1) },
    ];
  }, [reorder]);

  const menu = useSongMenu(song, [...reorderItems, ...extraMenu]);

  const play = () => {
    if (onPlayOverride) onPlayOverride();
    else if (isCurrent) toggle();
    else playSong(song, list);
  };

  return (
    <div
      {...(reorder?.dndProps ?? {})}
      onDoubleClick={play}
      aria-current={isCurrent ? 'true' : undefined}
      className={cn(
        'group grid items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-line/5 focus-within:bg-line/5 md:gap-3',
        showAlbum ? 'grid-cols-[2rem_minmax(0,1fr)_auto] md:grid-cols-[2rem_minmax(0,3fr)_minmax(0,2fr)_auto]' : 'grid-cols-[2rem_minmax(0,1fr)_auto]',
        isCurrent && 'bg-brand/10 hover:bg-brand/15',
        reorder?.isDragging && 'opacity-40',
        reorder?.isOver && !reorder.isDragging && 'ring-2 ring-brand/60',
        reorder && 'cursor-grab',
      )}
    >
      <button
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-sm tabular-nums text-muted hover:text-ink"
        onClick={play}
        aria-label={playingNow ? `Pause ${song.title}` : `Play ${song.title}`}
      >
        <span className={cn('group-hover:hidden group-focus-within:hidden', isCurrent && 'hidden')}>{showIndex ? index + 1 : <Play className="h-4 w-4" />}</span>
        {isCurrent && <EqBars playing={playingNow} className="group-hover:hidden group-focus-within:hidden" />}
        <span className="hidden group-hover:block group-focus-within:block">{playingNow ? <Pause className="h-4 w-4 fill-current text-ink" /> : <Play className="h-4 w-4 fill-current text-ink" />}</span>
      </button>

      <div className="flex min-w-0 items-center gap-3">
        <Cover src={song.artwork} seed={song.id} className="h-11 w-11 shrink-0 !rounded-lg" />
        <div className="min-w-0">
          <button onClick={play} className={cn('block max-w-full truncate text-left text-sm font-semibold hover:underline', isCurrent && 'text-brand')} title={song.title} tabIndex={-1}>
            {song.title}
          </button>
          <Link to={`/artist/${artistIdOf(song)}`} className="block truncate text-xs text-muted hover:text-ink hover:underline">
            {song.artist}
          </Link>
        </div>
      </div>

      {showAlbum && (
        <Link to={`/album/${albumIdOf(song)}`} className="hidden truncate text-sm text-muted hover:text-ink hover:underline md:block">
          {song.album}
        </Link>
      )}

      <div className="flex items-center gap-0.5 md:gap-1">
        {reorder && <GripVertical className="hidden h-4 w-4 text-muted opacity-0 group-hover:opacity-100 md:block" aria-hidden="true" />}
        <button
          className={cn('icon-btn h-9 w-9', liked ? 'text-brand' : 'md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100')}
          onClick={() => toggleLike(song.id)}
          aria-label={liked ? `Unlike ${song.title}` : `Like ${song.title}`}
          aria-pressed={liked}
        >
          <Heart className={cn('h-[18px] w-[18px]', liked && 'fill-current')} />
        </button>
        <span className="w-11 text-right text-sm tabular-nums text-muted">{formatTime(song.duration)}</span>
        <MenuButton items={menu} label={`More options for ${song.title}`} className="h-9 w-9" />
      </div>
    </div>
  );
});

export function SongListHeader({ showAlbum = true }: { showAlbum?: boolean }) {
  return (
    <div
      className={cn(
        'mb-1 hidden items-center gap-3 border-b border-line/10 px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted md:grid',
        showAlbum ? 'grid-cols-[2rem_minmax(0,3fr)_minmax(0,2fr)_auto]' : 'grid-cols-[2rem_minmax(0,1fr)_auto]',
      )}
    >
      <span className="text-center">#</span>
      <span>Title</span>
      {showAlbum && <span>Album</span>}
      <span className="pr-12 text-right">Time</span>
    </div>
  );
}
