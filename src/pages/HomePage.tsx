import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Heart, Library, ListMusic, Music4, Shuffle, Upload } from 'lucide-react';
import { AlbumCard, ArtistCard, PlaylistArt, PlaylistCard, SongCard } from '../components/Cards';
import { EmptyState, PageSkeleton, Shelf } from '../components/ui';
import { useLibrary } from '../context/LibraryContext';
import { usePlayerActions } from '../context/PlayerContext';
import { useUI } from '../context/UIContext';
import { APP_TAGLINE } from '../config';
import { daySeed, greeting, seededShuffle, sortSongs } from '../lib/utils';
import type { Playlist } from '../types';

function QuickTile({ to, label, sub, icon, art }: { to: string; label: string; sub?: string; icon?: React.ReactNode; art?: React.ReactNode }) {
  return (
    <Link to={to} className="group flex h-16 items-center gap-3 overflow-hidden rounded-xl bg-line/5 pr-3 transition hover:bg-line/10">
      <span className="flex h-16 w-16 shrink-0 items-center justify-center bg-gradient-to-br from-brand to-accent text-white [&>*]:h-full [&>*]:w-full [&>svg]:h-6 [&>svg]:w-6">{art ?? icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold">{label}</span>
        {sub && <span className="block truncate text-xs text-muted">{sub}</span>}
      </span>
    </Link>
  );
}

export default function HomePage() {
  const { ready, songs, albums, artists, recentSongs, likedIds, playlists, mixes, history } = useLibrary();
  const { playList } = usePlayerActions();
  const { pickFiles } = useUI();

  const recommended = useMemo(() => {
    // Affinity: artists and genres of liked + recently played songs rank higher; the day seed rotates ties.
    const byId = new Map(songs.map((s) => [s.id, s]));
    const artistW = new Map<string, number>();
    const genreW = new Map<string, number>();
    const bump = (id: string, w: number) => {
      const s = byId.get(id);
      if (!s) return;
      artistW.set(s.artist, (artistW.get(s.artist) || 0) + w);
      if (s.genre) genreW.set(s.genre, (genreW.get(s.genre) || 0) + w);
    };
    likedIds.forEach((id) => bump(id, 3));
    history.slice(0, 30).forEach((h) => bump(h.id, 1));
    const recentIds = new Set(recentSongs.slice(0, 4).map((s) => s.id));
    const rotated = seededShuffle(songs, daySeed());
    return rotated
      .map((s, i) => ({ s, score: (artistW.get(s.artist) || 0) * 2 + (genreW.get(s.genre || '') || 0) + (s.popularity || 0) / 50 - i * 0.01 - (recentIds.has(s.id) ? 5 : 0) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((x) => x.s);
  }, [songs, likedIds, history, recentSongs]);

  const popularAlbums = useMemo(() => {
    const byId = new Map(songs.map((s) => [s.id, s]));
    const pop = (ids: string[]) => ids.reduce((sum, id) => sum + (byId.get(id)?.popularity || 0), 0) / Math.max(1, ids.length);
    return albums.filter((a) => a.songIds.some((id) => byId.get(id)?.source === 'catalog')).sort((a, b) => pop(b.songIds) - pop(a.songIds)).slice(0, 10);
  }, [albums, songs]);

  const popularArtists = useMemo(() => {
    const byId = new Map(songs.map((s) => [s.id, s]));
    const pop = (ids: string[]) => ids.reduce((sum, id) => sum + (byId.get(id)?.popularity || 0), 0) / Math.max(1, ids.length);
    return artists.filter((a) => a.songIds.some((id) => byId.get(id)?.source === 'catalog')).sort((a, b) => pop(b.songIds) - pop(a.songIds)).slice(0, 10);
  }, [artists, songs]);

  const recentlyAdded = useMemo(() => sortSongs(songs, 'recent').slice(0, 12), [songs]);

  if (!ready) return <PageSkeleton />;

  const quickPlaylists: Playlist[] = [...playlists, ...mixes].slice(0, 3);

  return (
    <div className="pb-8 pt-2">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{greeting()}</h1>
          <p className="mt-1 text-muted">{APP_TAGLINE}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={() => playList(songs, { shuffle: true })}>
            <Shuffle className="h-4 w-4" /> Shuffle all
          </button>
          <button className="btn-ghost" onClick={pickFiles}>
            <Upload className="h-4 w-4" /> Add music
          </button>
        </div>
      </div>

      <section aria-label="Quick access" className="mb-9 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <QuickTile to="/library?tab=liked" label="Liked Songs" sub={`${likedIds.length} ${likedIds.length === 1 ? 'song' : 'songs'}`} icon={<Heart className="fill-current" />} />
        <QuickTile to="/library?tab=recent" label="Recently Played" sub={recentSongs.length ? `${recentSongs.length} songs` : 'Nothing yet'} icon={<Clock />} />
        <QuickTile to="/library" label="Your Library" sub={`${songs.length} songs`} icon={<Library />} />
        {quickPlaylists.map((p) => (
          <QuickTile key={p.id} to={`/playlist/${p.id}`} label={p.name} sub={p.virtual ? 'Made for you' : 'Playlist'} art={<PlaylistArt playlist={p} className="!rounded-none" />} />
        ))}
      </section>

      {recentSongs.length > 0 ? (
        <Shelf title="Recently played" to="/library?tab=recent">
          {recentSongs.slice(0, 12).map((s) => (
            <SongCard key={s.id} song={s} list={recentSongs} />
          ))}
        </Shelf>
      ) : (
        <EmptyState className="mb-9" icon={<Clock className="h-6 w-6" />} title="Your recently played songs will show up here" message="Start with a recommendation below, or shuffle your whole library." />
      )}

      {mixes.length > 0 && (
        <Shelf title="Made for you" subtitle="Personalised mixes that update as you listen">
          {mixes.map((m) => (
            <PlaylistCard key={m.id} playlist={m} />
          ))}
        </Shelf>
      )}

      {playlists.length > 0 && (
        <Shelf title="Your playlists" to="/library?tab=playlists">
          {playlists.map((p) => (
            <PlaylistCard key={p.id} playlist={p} />
          ))}
        </Shelf>
      )}

      <Shelf title="Recommended tracks" subtitle={likedIds.length || history.length ? 'Based on what you like' : 'Fresh picks for today'}>
        {recommended.map((s) => (
          <SongCard key={s.id} song={s} list={recommended} />
        ))}
      </Shelf>

      <Shelf title="Popular albums" to="/library?tab=albums">
        {popularAlbums.map((a) => (
          <AlbumCard key={a.id} album={a} />
        ))}
      </Shelf>

      <Shelf title="Popular artists" to="/library?tab=artists">
        {popularArtists.map((a) => (
          <ArtistCard key={a.id} artist={a} />
        ))}
      </Shelf>

      <Shelf title="Recently added" to="/library?tab=songs">
        {recentlyAdded.map((s) => (
          <SongCard key={s.id} song={s} list={recentlyAdded} />
        ))}
      </Shelf>

      <p className="mt-2 flex items-center gap-2 text-xs text-muted">
        <ListMusic className="h-4 w-4" /> <Music4 className="h-4 w-4" /> Demo audio by SoundHelix (free to use). Add your own files with &ldquo;Add music&rdquo;.
      </p>
    </div>
  );
}
