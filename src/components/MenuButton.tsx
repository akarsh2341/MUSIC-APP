import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '../lib/utils';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  hidden?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
}

/** Kebab button + popover menu rendered in a portal (so it is never clipped by scroll containers). */
export function MenuButton({
  items,
  label = 'More options',
  className,
  children,
}: {
  items: MenuItem[];
  label?: string;
  className?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const visible = items.filter((i) => !i.hidden);

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) btn.current?.focus();
  }, []);

  useLayoutEffect(() => {
    if (!open || !btn.current || !menu.current) return;
    const r = btn.current.getBoundingClientRect();
    const m = menu.current.getBoundingClientRect();
    const margin = 8;
    let left = r.right - m.width;
    left = Math.max(margin, Math.min(left, window.innerWidth - m.width - margin));
    let top = r.bottom + 6;
    if (top + m.height > window.innerHeight - margin) top = Math.max(margin, r.top - m.height - 6);
    setPos({ top, left });
  }, [open, visible.length]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (menu.current?.contains(t) || btn.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close(true);
      }
    };
    const onScroll = () => close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onScroll);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, close]);

  useEffect(() => {
    if (open && pos) menu.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus();
  }, [open, pos]);

  const onMenuKey = (e: React.KeyboardEvent) => {
    const els = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []);
    const i = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      els[(i + 1) % els.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      els[(i - 1 + els.length) % els.length]?.focus();
    } else if (e.key === 'Tab') {
      close();
    }
  };

  if (!visible.length) return null;

  return (
    <>
      <button
        ref={btn}
        type="button"
        className={cn('icon-btn', className)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setPos(null);
          setOpen((o) => !o);
        }}
      >
        {children ?? <MoreHorizontal className="h-5 w-5" />}
      </button>
      {open &&
        createPortal(
          <div
            ref={menu}
            role="menu"
            aria-label={label}
            onKeyDown={onMenuKey}
            style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, visibility: pos ? 'visible' : 'hidden' }}
            className="fixed z-[90] min-w-[200px] max-w-[280px] rounded-2xl border border-line/10 bg-elevated p-1.5 shadow-2xl animate-fadeIn"
          >
            {visible.map((item, i) => (
              <div key={`${item.label}-${i}`}>
                {item.separatorBefore && i > 0 && <div className="my-1 h-px bg-line/10" />}
                <button
                  role="menuitem"
                  disabled={item.disabled}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition hover:bg-line/10 focus:bg-line/10 focus:outline-none disabled:opacity-40',
                    item.danger && 'text-red-400',
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    close();
                    item.onClick();
                  }}
                >
                  {item.icon && <span className="flex h-4 w-4 items-center justify-center text-muted [&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>}
                  <span className="truncate">{item.label}</span>
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
