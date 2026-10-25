import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Heart, Library, Music4, Shuffle, Upload } from 'lucide-react';
import { PlaylistArt, PlaylistCard, SongCard } from '../components/Cards';
import { EmptyState, PageSkeleton, Shelf } from '../components/ui';
import { useLibrary } from '../context/LibraryContext';
import { usePlayerActions } from '../context/PlayerContext';
import { useUI } from '../context/UIContext';
import { APP_TAGLINE } from '../config';
import { greeting, sortSongs } from '../lib/utils';
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
  const { ready, songs, recentSongs, likedIds, playlists, mixes } = useLibrary();
  const { playList } = usePlayerActions();
  const { pickFiles } = useUI();

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
          <button className="btn-primary" disabled={!songs.length} onClick={() => playList(songs, { shuffle: true })}>
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
        <EmptyState
          className="mb-9"
          icon={<Music4 className="h-6 w-6" />}
          title={songs.length ? 'Your recently played songs will show up here' : 'Your library is empty'}
          message={songs.length ? 'Pick something from your library to get started.' : 'Add your own music files to start listening. They stay on this device.'}
          action={!songs.length ? <button className="btn-primary" onClick={pickFiles}>Add music</button> : undefined}
        />
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

      {recentlyAdded.length > 0 && <Shelf title="Recently added" to="/library?tab=songs">
        {recentlyAdded.map((s) => (
          <SongCard key={s.id} song={s} list={recentlyAdded} />
        ))}
      </Shelf>}

    </div>
  );
}
