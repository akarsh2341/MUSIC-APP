import { useState } from 'react';
import { Volume1, Volume2, VolumeX } from 'lucide-react';
import { useCurrentTime, usePlayerActions, usePlayerState } from '../context/PlayerContext';
import { cn, formatTime } from '../lib/utils';

/** Seek bar with elapsed / total time. Dragging previews locally and commits on release. */
export function SeekBar({ showTimes = true, large = false, className }: { showTimes?: boolean; large?: boolean; className?: string }) {
  const { duration, current } = usePlayerState();
  const { seek } = usePlayerActions();
  const time = useCurrentTime();
  const [drag, setDrag] = useState<number | null>(null);
  const enabled = !!current && Number.isFinite(duration) && duration > 0;
  const value = drag ?? Math.min(time, duration || 0);
  const pct = enabled ? (value / duration) * 100 : 0;

  return (
    <div className={cn('flex w-full items-center gap-3', className)}>
      {showTimes && <span className="w-10 text-right text-xs tabular-nums text-muted">{formatTime(value)}</span>}
      <input
        type="range"
        className={cn('vp-range', large && 'vp-always')}
        min={0}
        max={enabled ? duration : 1}
        step={1}
        value={enabled ? value : 0}
        disabled={!enabled}
        aria-label="Seek"
        aria-valuetext={`${formatTime(value)} of ${formatTime(duration)}`}
        style={{ ['--p' as string]: `${pct}%` }}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (drag !== null) setDrag(v);
          else seek(v); // keyboard / assistive tech: commit immediately
        }}
        onPointerDown={(e) => setDrag(Number((e.target as HTMLInputElement).value))}
        onPointerUp={() => {
          if (drag !== null) seek(drag);
          setDrag(null);
        }}
        onPointerCancel={() => setDrag(null)}
      />
      {showTimes && <span className="w-10 text-xs tabular-nums text-muted">{formatTime(duration)}</span>}
    </div>
  );
}

export function VolumeControl({ className }: { className?: string }) {
  const { volume, muted } = usePlayerState();
  const { setVolume, toggleMute } = usePlayerActions();
  const effective = muted ? 0 : volume;
  const Icon = effective === 0 ? VolumeX : effective < 0.5 ? Volume1 : Volume2;
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <button className="icon-btn" onClick={toggleMute} aria-label={muted || volume === 0 ? 'Unmute' : 'Mute'} aria-pressed={muted}>
        <Icon className="h-5 w-5" />
      </button>
      <input
        type="range"
        className="vp-range w-24"
        min={0}
        max={1}
        step={0.01}
        value={effective}
        aria-label="Volume"
        aria-valuetext={`${Math.round(effective * 100)}%`}
        style={{ ['--p' as string]: `${effective * 100}%` }}
        onChange={(e) => setVolume(Number(e.target.value))}
      />
    </div>
  );
}
