import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Clock, Search, X } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { suggest } from '../lib/search';
import { cn } from '../lib/utils';

/**
 * Search input bound to the `?q=` URL parameter (so results are linkable and survive reloads).
 * With `dropdown`, shows recent searches / autocomplete suggestions while focused.
 */
export function SearchBar({ dropdown = true, id, className, autoFocus }: { dropdown?: boolean; id?: string; className?: string; autoFocus?: boolean }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const urlQ = pathname === '/search' ? params.get('q') ?? '' : '';
  const { songs, albums, artists, playlists, recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches } = useLibrary();

  const [value, setValue] = useState(urlQ);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // URL -> input (e.g. a recent search chip was clicked, or the back button was pressed)
  useEffect(() => setValue(urlQ), [urlQ]);

  // input -> URL (debounced)
  useEffect(() => {
    if (value === urlQ) return;
    const t = window.setTimeout(() => {
      if (pathname === '/search') setParams(value ? { q: value } : {}, { replace: true });
      else if (value) navigate(`/search?q=${encodeURIComponent(value)}`);
    }, 250);
    return () => window.clearTimeout(t);
  }, [value, urlQ, pathname, navigate, setParams]);

  const suggestions = useMemo(() => suggest(value, { songs, albums, artists, playlists }), [value, songs, albums, artists, playlists]);

  const entries = value.trim() ? suggestions.map((s) => ({ text: s, kind: 'suggestion' as const })) : [
    ...recentSearches.map((s) => ({ text: s, kind: 'recent' as const })),
  ];

  const open = dropdown && focused && entries.length > 0;

  const commit = (text: string) => {
    const q = text.trim();
    setValue(q);
    setFocused(false);
    inputRef.current?.blur();
    if (!q) return;
    addRecentSearch(q);
    if (pathname === '/search') setParams({ q }, { replace: true });
    else navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && open) {
      e.preventDefault();
      setActive((a) => (a + 1) % entries.length);
    } else if (e.key === 'ArrowUp' && open) {
      e.preventDefault();
      setActive((a) => (a <= 0 ? entries.length - 1 : a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commit(open && active >= 0 ? entries[active].text : value);
    } else if (e.key === 'Escape') {
      if (value) setValue('');
      else inputRef.current?.blur();
      setFocused(false);
    }
  };

  const listId = `${id ?? 'search'}-listbox`;

  return (
    <div ref={wrapRef} className={cn('relative w-full', className)}>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        ref={inputRef}
        id={id}
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        aria-label="Search songs, albums, artists and playlists"
        placeholder="Search songs, albums, artists, playlists"
        autoComplete="off"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setActive(-1);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        onKeyDown={onKey}
        className="h-11 w-full appearance-none rounded-full border border-line/15 bg-elevated pl-11 pr-11 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          className="icon-btn absolute right-1.5 top-1/2 h-8 w-8 -translate-y-1/2"
          aria-label="Clear search"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setValue('');
            inputRef.current?.focus();
          }}
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {open && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-line/10 bg-elevated p-1.5 shadow-2xl animate-fadeIn">
          {!value.trim() && recentSearches.length > 0 && (
            <li className="flex items-center justify-between px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-wider text-muted" role="presentation">
              Recent
              <button className="font-semibold normal-case tracking-normal hover:text-ink" onMouseDown={(e) => e.preventDefault()} onClick={clearRecentSearches}>
                Clear all
              </button>
            </li>
          )}
          {entries.map((e, i) => (
            <li key={`${e.kind}-${e.text}`} role="presentation">
              <div
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(ev) => ev.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => commit(e.text)}
                className={cn('flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm', i === active ? 'bg-line/10' : 'hover:bg-line/5')}
              >
                {e.kind === 'recent' ? <Clock className="h-4 w-4 text-muted" /> : <Search className="h-4 w-4 text-muted" />}
                <span className="flex-1 truncate">{e.text}</span>
                {e.kind === 'recent' && (
                  <button
                    className="rounded-full p-1 text-muted hover:bg-line/10 hover:text-ink"
                    aria-label={`Remove ${e.text} from recent searches`}
                    onMouseDown={(ev) => ev.preventDefault()}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      removeRecentSearch(e.text);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
