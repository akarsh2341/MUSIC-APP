import { Link } from 'react-router-dom';
import { Heart, ListMusic, Maximize2, Music2, RotateCw, SkipForward } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { useCurrentTime, usePlayerActions, usePlayerState } from '../context/PlayerContext';
import { useUI } from '../context/UIContext';
import { artistIdOf } from '../lib/library';
import { cn } from '../lib/utils';
import { SeekBar, VolumeControl } from './Sliders';
import { PlayPauseButton, TransportControls } from './Transport';
import { Cover } from './ui';

function ThinProgress() {
  const { duration } = usePlayerState();
  const t = useCurrentTime();
  const pct = duration > 0 ? Math.min(100, (t / duration) * 100) : 0;
  return (
    <div className="absolute inset-x-0 top-0 h-0.5 bg-line/10 md:hidden" aria-hidden="true">
      <div className="h-full bg-gradient-to-r from-brand to-accent" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function MiniPlayer() {
  const { current, queue, error, isPlaying } = usePlayerState();
  const { next, retry } = usePlayerActions();
  const { isLiked, toggleLike } = useLibrary();
  const { setFullScreenOpen, queueOpen, setQueueOpen } = useUI();
  const liked = current ? isLiked(current.id) : false;

  // On phones, the bar only appears once something is queued.
  const hiddenOnMobile = !current;

  return (
    <div
      className={cn('relative z-30 shrink-0 border-t border-line/10 bg-surface/95 backdrop-blur-xl', hiddenOnMobile && 'hidden md:block')}
      role="region"
      aria-label="Mini player"
    >
      <ThinProgress />

      {/* ---------- Mobile ---------- */}
      <div className="flex items-center gap-3 px-3 py-2 md:hidden">
        <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setFullScreenOpen(true)} aria-label="Open full-screen player">
          {current && <Cover src={current.artwork} seed={current.id} className={cn('h-12 w-12 shrink-0 !rounded-lg', isPlaying && 'shadow-lg shadow-brand/30')} eager />}
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{current?.title}</span>
            <span className={cn('block truncate text-xs', error ? 'text-red-400' : 'text-muted')}>{error ? 'Unavailable - tap to retry' : current?.artist}</span>
          </span>
        </button>
        {error ? (
          <button className="icon-btn" onClick={retry} aria-label="Retry playback">
            <RotateCw className="h-5 w-5" />
          </button>
        ) : (
          <button className={cn('icon-btn', liked && 'text-brand')} onClick={() => current && toggleLike(current.id)} aria-label={liked ? 'Unlike' : 'Like'} aria-pressed={liked}>
            <Heart className={cn('h-5 w-5', liked && 'fill-current')} />
          </button>
        )}
        <PlayPauseButton size="sm" />
        <button className="icon-btn -ml-1" onClick={next} aria-label="Next track" disabled={!current || queue.length < 2}>
          <SkipForward className="h-5 w-5 fill-current" />
        </button>
      </div>

      {/* ---------- Desktop ---------- */}
      <div className="hidden h-[84px] grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)] items-center gap-4 px-4 md:grid">
        <div className="flex min-w-0 items-center gap-3">
          {current ? (
            <>
              <button className="group relative shrink-0" onClick={() => setFullScreenOpen(true)} aria-label="Open full-screen player">
                <Cover src={current.artwork} seed={current.id} className="h-14 w-14 !rounded-lg shadow-lg shadow-black/40" eager />
                <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 opacity-0 transition group-hover:opacity-100">
                  <Maximize2 className="h-5 w-5 text-white" />
                </span>
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold" title={current.title}>
                  {current.title}
                </p>
                {error ? (
                  <button className="flex items-center gap-1 text-xs text-red-400 hover:underline" onClick={retry}>
                    <RotateCw className="h-3 w-3" /> {error} Retry
                  </button>
                ) : (
                  <Link to={`/artist/${artistIdOf(current)}`} className="block truncate text-xs text-muted hover:text-ink hover:underline">
                    {current.artist}
                  </Link>
                )}
              </div>
              <button className={cn('icon-btn', liked && 'text-brand')} onClick={() => toggleLike(current.id)} aria-label={liked ? 'Unlike' : 'Like'} aria-pressed={liked}>
                <Heart className={cn('h-5 w-5', liked && 'fill-current')} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3 text-muted">
              <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-line/5">
                <Music2 className="h-6 w-6" />
              </span>
              <p className="text-sm">Nothing playing yet. Pick a song to start.</p>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <TransportControls />
          <SeekBar className="max-w-xl" />
        </div>

        <div className="flex items-center justify-end gap-1">
          <button className={cn('icon-btn', queueOpen && 'is-on')} onClick={() => setQueueOpen(!queueOpen)} aria-label="Queue" aria-pressed={queueOpen}>
            <ListMusic className="h-5 w-5" />
          </button>
          <VolumeControl />
          <button className="icon-btn" onClick={() => setFullScreenOpen(true)} disabled={!current} aria-label="Open full-screen player">
            <Maximize2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
