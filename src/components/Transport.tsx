import { Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from 'lucide-react';
import { usePlayerActions, usePlayerState } from '../context/PlayerContext';
import { cn } from '../lib/utils';
import { Spinner } from './ui';

export function PlayPauseButton({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const { current, isPlaying, isLoading, error } = usePlayerState();
  const { toggle } = usePlayerActions();
  const dims = size === 'lg' ? 'h-16 w-16' : size === 'md' ? 'h-11 w-11' : 'h-10 w-10';
  const icon = size === 'lg' ? 'h-7 w-7' : 'h-5 w-5';
  const busy = isLoading && !error;
  return (
    <button
      className={cn('flex shrink-0 items-center justify-center rounded-full bg-ink text-bg shadow-lg transition hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100', dims, className)}
      onClick={toggle}
      disabled={!current}
      aria-label={isPlaying ? 'Pause' : 'Play'}
      aria-busy={busy}
    >
      {busy ? <Spinner className={icon} /> : isPlaying ? <Pause className={cn(icon, 'fill-current')} /> : <Play className={cn(icon, 'ml-0.5 fill-current')} />}
    </button>
  );
}

export function TransportControls({ size = 'md', showShuffleRepeat = true, className }: { size?: 'sm' | 'md' | 'lg'; showShuffleRepeat?: boolean; className?: string }) {
  const { shuffle, repeat, current } = usePlayerState();
  const { next, prev, toggleShuffle, cycleRepeat } = usePlayerActions();
  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;
  const skip = size === 'lg' ? 'h-12 w-12' : '';
  const skipIcon = size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
  return (
    <div className={cn('flex items-center justify-center gap-2 sm:gap-3', size === 'lg' && 'gap-3 sm:gap-6', className)}>
      {showShuffleRepeat && (
        <button className="icon-btn" onClick={toggleShuffle} aria-label={shuffle ? 'Shuffle: on' : 'Shuffle: off'} aria-pressed={shuffle} disabled={!current}>
          <Shuffle className="h-5 w-5" />
        </button>
      )}
      <button className={cn('icon-btn text-ink', skip)} onClick={prev} aria-label="Previous track" disabled={!current}>
        <SkipBack className={cn(skipIcon, 'fill-current')} />
      </button>
      <PlayPauseButton size={size} />
      <button className={cn('icon-btn text-ink', skip)} onClick={next} aria-label="Next track" disabled={!current}>
        <SkipForward className={cn(skipIcon, 'fill-current')} />
      </button>
      {showShuffleRepeat && (
        <button
          className="icon-btn"
          onClick={cycleRepeat}
          aria-label={repeat === 'off' ? 'Repeat: off' : repeat === 'all' ? 'Repeat: all' : 'Repeat: one'}
          aria-pressed={repeat !== 'off'}
          disabled={!current}
        >
          <RepeatIcon className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
