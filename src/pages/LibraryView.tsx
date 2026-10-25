import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Clock, Disc3, Heart, ListMusic, Music, Plus, Trash2, Upload, User } from 'lucide-react';
import { AlbumCard, ArtistCard, PlaylistCard } from '../components/Cards';
import { PlayShuffleButtons, SongList, SortSelect, type SortValue } from '../components/SongList';
import { EmptyState, PageSkeleton, SectionHeader } from '../components/ui';
import { useLibrary } from '../context/LibraryContext';
import { useUI } from '../context/UIContext';
import { readString, writeString } from '../lib/storage';
import { cn, formatTotal, pluralize, sortSongs, totalDuration } from '../lib/utils';
import type { SortKey } from '../types';

type Tab = 'songs' | 'albums' | 'artists' | 'playlists' | 'liked' | 'recent';
const TABS: Array<{ id: Tab; label: string; icon: typeof Music }> = [
  { id: 'songs', label: 'Songs', icon: Music },
  { id: 'albums', label: 'Albums', icon: Disc3 },
  { id: 'artists', label: 'Artists', icon: User },
  { id: 'playlists', label: 'Playlists', icon: ListMusic },
  { id: 'liked', label: 'Liked', icon: Heart },
  { id: 'recent', label: 'Recent', icon: Clock },
];

function readSort(): SortKey {
  const v = readString('sort');
  return v === 'title' || v === 'artist' || v === 'recent' ? v : 'recent';
}

export default function LibraryView() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const raw = params.get('tab');
  const tab: Tab = TABS.some((t) => t.id === raw) ? (raw as Tab) : 'songs';
  const [sort, setSortState] = useState<SortKey>(readSort);
  const { ready, songs, albums, artists, playlists, mixes, likedSongs, recentSongs, clearHistory } = useLibrary();
  const { openCreatePlaylist, pickFiles, confirm } = useUI();

  const setSort = (v: SortValue) => {
    const key = v === 'custom' ? 'recent' : v;
    setSortState(key);
    writeString('sort', key);
  };

  const sortedSongs = useMemo(() => sortSongs(songs, sort), [songs, sort]);
  // Liked songs are stored newest-first, so "recent" keeps that order.
  const sortedLiked = useMemo(() => (sort === 'recent' ? likedSongs : sortSongs(likedSongs, sort)), [likedSongs, sort]);
  const sortedAlbums = useMemo(() => {
    const out = albums.slice();
    if (sort === 'title') out.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === 'artist') out.sort((a, b) => a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title));
    else out.sort((a, b) => b.addedAt - a.addedAt);
    return out;
  }, [albums, sort]);
  const sortedArtists = useMemo(() => artists.slice().sort((a, b) => a.name.localeCompare(b.name)), [artists]);

  const heading = {
    songs: { title: 'Songs', sub: `${pluralize(songs.length, 'song')} · ${formatTotal(totalDuration(songs))}` },
    albums: { title: 'Albums', sub: pluralize(albums.length, 'album') },
    artists: { title: 'Artists', sub: pluralize(artists.length, 'artist') },
    playlists: { title: 'Playlists', sub: pluralize(playlists.length, 'playlist') },
    liked: { title: 'Liked Songs', sub: `${pluralize(likedSongs.length, 'song')} · ${formatTotal(totalDuration(likedSongs))}` },
    recent: { title: 'Recently Played', sub: pluralize(recentSongs.length, 'song') },
  }[tab];

  return (
    <div className="pb-8 pt-1">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{heading.title}</h1>
          <p className="mt-1 text-sm text-muted">{ready ? heading.sub : 'Loading your library…'}</p>
        </div>
        <button className="btn-ghost" onClick={pickFiles}>
          <Upload className="h-4 w-4" /> Add music
        </button>
      </div>

      <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0" role="tablist" aria-label="Library sections">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} role="tab" aria-selected={tab === id} className={cn('chip shrink-0 gap-2', tab === id && 'is-on')} onClick={() => setParams(id === 'songs' ? {} : { tab: id }, { replace: true })}>
            <Icon className="h-4 w-4" aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      {!ready ? (
        <PageSkeleton />
      ) : (
        <div role="tabpanel" aria-label={heading.title}>
          {tab === 'songs' && (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <PlayShuffleButtons songs={sortedSongs} />
                <SortSelect value={sort} onChange={setSort} />
              </div>
              <SongList songs={sortedSongs} />
            </>
          )}

          {tab === 'albums' && (
            <>
              <div className="mb-4 flex justify-end">
                <SortSelect value={sort} onChange={setSort} />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {sortedAlbums.map((a) => (
                  <AlbumCard key={a.id} album={a} fluid />
                ))}
              </div>
            </>
          )}

          {tab === 'artists' && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {sortedArtists.map((a) => (
                <ArtistCard key={a.id} artist={a} fluid />
              ))}
            </div>
          )}

          {tab === 'playlists' && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                <button onClick={() => openCreatePlaylist()} className="flex aspect-square flex-col items-center justify-center gap-2 self-start rounded-2xl border-2 border-dashed border-line/15 p-2 text-muted transition hover:border-brand/60 hover:text-ink" style={{ margin: '0.5rem' }}>
                  <Plus className="h-8 w-8" />
                  <span className="text-sm font-semibold">New playlist</span>
                </button>
                {playlists.map((p) => (
                  <PlaylistCard key={p.id} playlist={p} fluid />
                ))}
              </div>
              {playlists.length === 0 && <EmptyState className="mt-6" icon={<ListMusic className="h-6 w-6" />} title="No playlists yet" message="Create a playlist, then add songs from any song's “⋯” menu." action={<button className="btn-primary" onClick={() => openCreatePlaylist()}>Create playlist</button>} />}
              {mixes.length > 0 && (
                <div className="mt-10">
                  <SectionHeader title="Made for you" subtitle="Auto-generated mixes. Open one to save it as a playlist." />
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                    {mixes.map((m) => (
                      <PlaylistCard key={m.id} playlist={m} fluid />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'liked' &&
            (likedSongs.length === 0 ? (
              <EmptyState icon={<Heart className="h-6 w-6" />} title="Songs you like will appear here" message="Tap the heart on any song to save it to Liked Songs." action={<button className="btn-primary" onClick={() => navigate('/')}>Find something to play</button>} />
            ) : (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <PlayShuffleButtons songs={sortedLiked} />
                  <SortSelect value={sort} onChange={setSort} />
                </div>
                <SongList songs={sortedLiked} />
              </>
            ))}

          {tab === 'recent' &&
            (recentSongs.length === 0 ? (
              <EmptyState icon={<Clock className="h-6 w-6" />} title="Nothing played yet" message="Songs you listen to will be listed here, most recent first." action={<button className="btn-primary" onClick={() => navigate('/')}>Browse music</button>} />
            ) : (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <PlayShuffleButtons songs={recentSongs} />
                  <button
                    className="btn-ghost"
                    onClick={() => confirm({ title: 'Clear listening history?', message: 'This removes your Recently Played list and resets personalised mixes. Your library and playlists are not affected.', confirmLabel: 'Clear history', danger: true, onConfirm: clearHistory })}
                  >
                    <Trash2 className="h-4 w-4" /> Clear history
                  </button>
                </div>
                <SongList songs={recentSongs} />
              </>
            ))}
        </div>
      )}
    </div>
  );
}
