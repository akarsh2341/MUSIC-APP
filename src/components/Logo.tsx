import { AudioLines } from 'lucide-react';
import { APP_NAME } from '../config';
import { cn } from '../lib/utils';

export function Logo({ className, showName = true }: { className?: string; showName?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-accent text-white shadow-lg shadow-brand/30" aria-hidden="true">
        <AudioLines className="h-5 w-5" />
      </span>
      {showName && <span className="text-xl font-extrabold tracking-tight">{APP_NAME}</span>}
    </span>
  );
}
