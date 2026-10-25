import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock, Search, SearchX, X } from 'lucide-react';
import { AlbumCard, ArtistCard, PlaylistCard } from '../components/Cards';
import { SearchBar } from '../components/SearchBar';
import { SongList } from '../components/SongList';
import { EmptyState, PageSkeleton, SectionHeader } from '../components/ui';
import { useLibrary } from '../context/LibraryContext';
import { runSearch } from '../lib/search';
import { cn } from '../lib/utils';

type Filter = 'all' | 'songs' | 'albums' | 'artists' | 'playlists';
const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'songs', label: 'Songs' },
  { id: 'albums', label: 'Albums' },
  { id: 'artists', label: 'Artists' },
  { id: 'playlists', label: 'Playlists' },
];

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = (params.get('q') ?? '').trim();
  const [filter, setFilter] = useState<Filter>('all');
  const { ready, songs, albums, artists, playlists, mixes, recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches } = useLibrary();

  const allPlaylists = useMemo(() => [...playlists, ...mixes], [playlists, mixes]);
  const results = useMemo(() => runSearch(q, { songs, albums, artists, playlists: allPlaylists }), [q, songs, albums, artists, allPlaylists]);

  const search = (text: string) => {
    addRecentSearch(text);
    setParams({ q: text });
  };

  return (
    <div className="pb-8 pt-1">
      <div className="mb-5 md:hidden">
        <SearchBar dropdown={false} id="mobile-search" />
      </div>

      {!ready ? (
        <PageSkeleton />
      ) : !q ? (
        <>
          {recentSearches.length > 0 && (
            <section className="mb-8" aria-label="Recent searches">
              <SectionHeader title="Recent searches">
                <button className="text-sm font-semibold text-muted hover:text-ink" onClick={clearRecentSearches}>
                  Clear all
                </button>
              </SectionHeader>
              <ul className="flex flex-wrap gap-2">
                {recentSearches.map((r) => (
                  <li key={r} className="chip gap-1 !pr-1.5">
                    <button className="inline-flex items-center gap-2" onClick={() => search(r)}>
                      <Clock className="h-3.5 w-3.5 text-muted" /> {r}
                    </button>
                    <button className="rounded-full p-1 text-muted hover:bg-line/10 hover:text-ink" onClick={() => removeRecentSearch(r)} aria-label={`Remove ${r} from recent searches`}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {recentSearches.length === 0 && (
            <EmptyState icon={<Search className="h-6 w-6" />} title="Search your music" message="Find songs, albums, artists and playlists in your library." />
          )}
        </>
      ) : results.total === 0 ? (
        <EmptyState icon={<SearchX className="h-6 w-6" />} title={`No results for “${q}”`} message="Check the spelling, or try a different song, artist or album." action={<button className="btn-ghost" onClick={() => setParams({})}>Clear search</button>} />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter results">
            {FILTERS.map((f) => {
              const count = f.id === 'all' ? results.total : results[f.id].length;
              if (f.id !== 'all' && count === 0) return null;
              return (
                <button key={f.id} className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                  {f.label} <span className={cn('ml-1.5 text-xs', filter === f.id ? 'opacity-70' : 'text-muted')}>{count}</span>
                </button>
              );
            })}
          </div>

          <p className="sr-only" role="status">
            {results.total} results for {q}
          </p>

          {(filter === 'all' || filter === 'artists') && results.artists.length > 0 && (
            <section className="mb-9" aria-label="Artists">
              <SectionHeader title="Artists" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                {results.artists.slice(0, filter === 'all' ? 6 : 60).map((a) => (
                  <ArtistCard key={a.id} artist={a} fluid />
                ))}
              </div>
            </section>
          )}

          {(filter === 'all' || filter === 'songs') && results.songs.length > 0 && (
            <section className="mb-9" aria-label="Songs">
              <SectionHeader title="Songs" />
              <SongList songs={filter === 'all' ? results.songs.slice(0, 8) : results.songs} />
            </section>
          )}

          {(filter === 'all' || filter === 'albums') && results.albums.length > 0 && (
            <section className="mb-9" aria-label="Albums">
              <SectionHeader title="Albums" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                {results.albums.slice(0, filter === 'all' ? 6 : 60).map((a) => (
                  <AlbumCard key={a.id} album={a} fluid />
                ))}
              </div>
            </section>
          )}

          {(filter === 'all' || filter === 'playlists') && results.playlists.length > 0 && (
            <section className="mb-9" aria-label="Playlists">
              <SectionHeader title="Playlists" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                {results.playlists.slice(0, filter === 'all' ? 6 : 60).map((p) => (
                  <PlaylistCard key={p.id} playlist={p} fluid />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
