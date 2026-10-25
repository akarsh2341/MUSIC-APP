import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { fallbackGradient } from '../lib/art';
import { cn } from '../lib/utils';

/** Image with graceful fallback to a generated gradient when the URL is broken. */
export function Cover({
  src,
  seed,
  alt = '',
  className,
  round = false,
  eager = false,
}: {
  src?: string;
  seed: string;
  alt?: string;
  className?: string;
  round?: boolean;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const shape = round ? 'rounded-full' : 'rounded-xl';
  if (!src || failed) {
    return (
      <div
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        className={cn('aspect-square overflow-hidden', shape, className)}
        style={{ background: fallbackGradient(seed) }}
      />
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      loading={eager ? 'eager' : 'lazy'}
      onError={() => setFailed(true)}
      className={cn('aspect-square bg-elevated object-cover', shape, className)}
    />
  );
}

/** Animated equalizer bars shown next to the track that is currently playing. */
export function EqBars({ playing, className }: { playing: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex h-4 items-end gap-[2px]', className)} aria-hidden="true">
      {[0, 0.25, 0.5].map((d) => (
        <span
          key={d}
          className="h-full w-[3px] origin-bottom rounded-sm bg-brand"
          style={{ animation: playing ? `eq 0.9s ease-in-out ${d}s infinite` : undefined, transform: playing ? undefined : 'scaleY(0.3)' }}
        />
      ))}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('animate-spin', className)} aria-hidden="true" />;
}

export function EmptyState({
  icon,
  title,
  message,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-2xl border border-dashed border-line/15 px-6 py-12 text-center', className)}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand/15 text-brand">{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function SectionHeader({ title, subtitle, to, actionLabel = 'See all', children }: { title: string; subtitle?: string; to?: string; actionLabel?: string; children?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="truncate text-xl font-bold tracking-tight md:text-2xl">{title}</h2>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {children}
        {to && (
          <Link to={to} className="text-sm font-semibold text-muted hover:text-ink">
            {actionLabel}
          </Link>
        )}
      </div>
    </div>
  );
}

/** Horizontally scrolling row with snap + working scroll buttons. */
export function Shelf({ title, subtitle, to, actionLabel, children }: { title: string; subtitle?: string; to?: string; actionLabel?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: -1 | 1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };
  return (
    <section className="mb-9" aria-label={title}>
      <SectionHeader title={title} subtitle={subtitle} to={to} actionLabel={actionLabel}>
        <div className="hidden gap-1 md:flex">
          <button className="icon-btn h-8 w-8 bg-line/5" aria-label={`Scroll ${title} left`} onClick={() => scroll(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button className="icon-btn h-8 w-8 bg-line/5" aria-label={`Scroll ${title} right`} onClick={() => scroll(1)}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </SectionHeader>
      <div ref={ref} className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:-mx-8 md:px-8">
        {children}
      </div>
    </section>
  );
}

export function PageSkeleton() {
  return (
    <div className="pt-4" aria-busy="true" aria-label="Loading">
      <div className="skeleton mb-6 h-9 w-56" />
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-16" />
        ))}
      </div>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="w-40 shrink-0 md:w-44">
            <div className="skeleton aspect-square" />
            <div className="skeleton mt-3 h-4 w-3/4" />
            <div className="skeleton mt-2 h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
