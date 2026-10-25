import { Link } from 'react-router-dom';
import { ChevronDown, Heart, ListMusic, RotateCw } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { usePlayerActions, usePlayerState } from '../context/PlayerContext';
import { useUI } from '../context/UIContext';
import { albumIdOf, artistIdOf } from '../lib/library';
import { cn } from '../lib/utils';
import { SeekBar, VolumeControl } from './Sliders';
import { TransportControls } from './Transport';
import { Cover } from './ui';

const BARS = 36;

/** Decorative equalizer. (Real FFT analysis needs CORS-enabled audio, which arbitrary URLs don't guarantee.) */
function Visualizer({ playing }: { playing: boolean }) {
  return (
    <div className="flex h-12 w-full max-w-md items-end justify-center gap-[3px]" aria-hidden="true">
      {Array.from({ length: BARS }).map((_, i) => {
        const dur = 0.55 + ((i * 37) % 60) / 70;
        const delay = -(((i * 13) % 10) / 10);
        return (
          <span
            key={i}
            className="h-full w-[5px] origin-bottom rounded-full bg-gradient-to-t from-brand to-accent"
            style={{
              animation: `eq ${dur.toFixed(2)}s ease-in-out ${delay.toFixed(2)}s infinite`,
              animationPlayState: playing ? 'running' : 'paused',
              transform: playing ? undefined : 'scaleY(0.12)',
              opacity: 0.55 + ((i * 7) % 5) / 12,
              transition: 'transform .4s',
            }}
          />
        );
      })}
    </div>
  );
}

export function FullScreenPlayer() {
  const { fullScreenOpen, setFullScreenOpen, queueOpen, setQueueOpen } = useUI();
  const { current, isPlaying, error } = usePlayerState();
  const { retry } = usePlayerActions();
  const { isLiked, toggleLike } = useLibrary();

  if (!fullScreenOpen || !current) return null;
  const liked = isLiked(current.id);

  return (
    <div role="dialog" aria-modal="true" aria-label="Now playing" className="fixed inset-0 z-[55] flex animate-slideUp flex-col overflow-hidden bg-bg">
      {/* Ambient backdrop derived from the cover art */}
      <div className="pointer-events-none absolute inset-0 -z-0" aria-hidden="true">
        <Cover src={current.artwork} seed={current.id} className="h-full w-full scale-150 !rounded-none opacity-40 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-bg/30 via-bg/70 to-bg" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-6">
        <button className="icon-btn" onClick={() => setFullScreenOpen(false)} aria-label="Close full-screen player">
          <ChevronDown className="h-6 w-6" />
        </button>
        <div className="min-w-0 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted">Playing from album</p>
          <Link to={`/album/${albumIdOf(current)}`} onClick={() => setFullScreenOpen(false)} className="block max-w-[60vw] truncate text-sm font-semibold hover:underline">
            {current.album}
          </Link>
        </div>
        <button className={cn('icon-btn', queueOpen && 'is-on')} onClick={() => setQueueOpen(!queueOpen)} aria-label="Queue" aria-pressed={queueOpen}>
          <ListMusic className="h-6 w-6" />
        </button>
      </header>

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col items-center justify-center gap-5 overflow-y-auto px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:flex-row lg:gap-16 lg:px-12">
        <div className="flex w-full max-w-[min(78vw,42dvh)] shrink-0 items-center justify-center lg:max-w-[min(34rem,70dvh)]">
          <Cover
            src={current.artwork}
            seed={current.id}
            alt={`Album art for ${current.album}`}
            eager
            className={cn('w-full !rounded-3xl shadow-2xl shadow-black/60 transition-transform duration-700 ease-out', isPlaying ? 'scale-100' : 'scale-[0.88]')}
          />
        </div>

        <div className="flex w-full max-w-md flex-col items-center gap-4 lg:items-stretch">
          <div className="flex w-full items-center gap-3">
            <div className="min-w-0 flex-1 text-left">
              <h2 className="truncate text-2xl font-extrabold tracking-tight md:text-3xl" title={current.title}>
                {current.title}
              </h2>
              <Link to={`/artist/${artistIdOf(current)}`} onClick={() => setFullScreenOpen(false)} className="block truncate text-base text-muted hover:text-ink hover:underline">
                {current.artist}
              </Link>
            </div>
            <button className={cn('icon-btn h-12 w-12', liked && 'text-brand')} onClick={() => toggleLike(current.id)} aria-label={liked ? 'Unlike' : 'Like'} aria-pressed={liked}>
              <Heart className={cn('h-6 w-6', liked && 'fill-current')} />
            </button>
          </div>

          {error ? (
            <div role="alert" className="flex w-full items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <span className="flex-1">{error}</span>
              <button className="btn-ghost !px-3 !py-1.5" onClick={retry}>
                <RotateCw className="h-4 w-4" /> Retry
              </button>
            </div>
          ) : (
            <Visualizer playing={isPlaying} />
          )}

          <SeekBar large className="w-full" />
          <TransportControls size="lg" />
          <div className="flex w-full items-center justify-center pt-1">
            <VolumeControl className="hidden sm:flex" />
          </div>
        </div>
      </div>
    </div>
  );
}
