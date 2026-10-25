import { Link } from 'react-router-dom';
import { Pause, Play } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { usePlayerActions, usePlayerState } from '../context/PlayerContext';
import { albumIdOf, artistIdOf } from '../lib/library';
import { cn, pluralize } from '../lib/utils';
import type { Album, Artist, Playlist, Song } from '../types';
import { Cover, EqBars } from './ui';

const CARD = 'group relative w-40 shrink-0 snap-start sm:w-44';

function PlayOverlay({ playing, label, onClick, round }: { playing: boolean; label: string; onClick: () => void; round?: boolean }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={cn(
        'absolute bottom-[3.9rem] right-2 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand to-accent text-white shadow-xl shadow-black/40 transition duration-200 hover:scale-105 focus-visible:translate-y-0 focus-visible:opacity-100 active:scale-95',
        'sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100',
        playing && 'sm:translate-y-0 sm:opacity-100',
        round && 'bottom-[4.4rem]',
      )}
    >
      {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
    </button>
  );
}

export function SongCard({ song, list, fluid }: { song: Song; list: Song[]; fluid?: boolean }) {
  const { current, isPlaying } = usePlayerState();
  const { playSong } = usePlayerActions();
  const isCurrent = current?.id === song.id;
  return (
    <div className={cn(fluid ? 'group relative w-full' : CARD)}>
      <button className="block w-full rounded-2xl p-2 text-left transition hover:bg-line/5" onClick={() => playSong(song, list)} aria-label={`${isCurrent && isPlaying ? 'Pause' : 'Play'} ${song.title} by ${song.artist}`}>
        <div className="relative">
          <Cover src={song.artwork} seed={song.id} className="w-full shadow-lg shadow-black/30" />
          {isCurrent && (
            <span className="absolute left-2 top-2 rounded-full bg-black/60 p-1.5 backdrop-blur">
              <EqBars playing={isPlaying} />
            </span>
          )}
        </div>
        <p className={cn('mt-3 truncate text-sm font-semibold', isCurrent && 'text-brand')}>{song.title}</p>
        <p className="truncate text-xs text-muted">{song.artist}</p>
      </button>
      <PlayOverlay playing={isCurrent && isPlaying} label={isCurrent && isPlaying ? `Pause ${song.title}` : `Play ${song.title}`} onClick={() => playSong(song, list)} />
    </div>
  );
}

export function AlbumCard({ album, fluid }: { album: Album; fluid?: boolean }) {
  const { resolve } = useLibrary();
  const { current, isPlaying } = usePlayerState();
  const { playList, toggle } = usePlayerActions();
  const active = !!current && album.songIds.includes(current.id) && albumIdOf(current) === album.id;
  return (
    <div className={cn(fluid ? 'group relative w-full' : CARD)}>
      <Link to={`/album/${album.id}`} className="block rounded-2xl p-2 transition hover:bg-line/5">
        <Cover src={album.artwork} seed={album.id} className="w-full shadow-lg shadow-black/30" />
        <p className={cn('mt-3 truncate text-sm font-semibold', active && 'text-brand')}>{album.title}</p>
        <p className="truncate text-xs text-muted">
          {album.year ? `${album.year} · ` : ''}
          {album.artist}
        </p>
      </Link>
      <PlayOverlay
        playing={active && isPlaying}
        label={`${active && isPlaying ? 'Pause' : 'Play'} album ${album.title}`}
        onClick={() => (active ? toggle() : playList(resolve(album.songIds)))}
      />
    </div>
  );
}

export function ArtistCard({ artist, fluid }: { artist: Artist; fluid?: boolean }) {
  const { resolve } = useLibrary();
  const { current, isPlaying } = usePlayerState();
  const { playList, toggle } = usePlayerActions();
  const active = !!current && artistIdOf(current) === artist.id;
  return (
    <div className={cn(fluid ? 'group relative w-full' : CARD)}>
      <Link to={`/artist/${artist.id}`} className="block rounded-2xl p-2 text-center transition hover:bg-line/5">
        <Cover src={artist.image} seed={artist.id} round className="w-full shadow-lg shadow-black/30" />
        <p className={cn('mt-3 truncate text-sm font-semibold', active && 'text-brand')}>{artist.name}</p>
        <p className="truncate text-xs text-muted">Artist · {pluralize(artist.songIds.length, 'song')}</p>
      </Link>
      <PlayOverlay
        round
        playing={active && isPlaying}
        label={`${active && isPlaying ? 'Pause' : 'Play'} songs by ${artist.name}`}
        onClick={() => (active ? toggle() : playList(resolve(artist.songIds)))}
      />
    </div>
  );
}

/** Collage of up to 4 song covers (or a gradient when the playlist is empty). */
export function PlaylistArt({ playlist, className }: { playlist: Playlist; className?: string }) {
  const { songById } = useLibrary();
  const covers = playlist.songIds
    .map((id) => songById.get(id))
    .filter((s): s is Song => !!s)
    .filter((s, i, arr) => arr.findIndex((x) => x.artwork === s.artwork) === i)
    .slice(0, 4);
  if (covers.length < 4) {
    const first = covers[0];
    return <Cover src={first?.artwork} seed={playlist.id} className={className} />;
  }
  return (
    <div className={cn('grid aspect-square grid-cols-2 overflow-hidden rounded-xl bg-elevated', className)}>
      {covers.map((c, i) => (
        <Cover key={i} src={c.artwork} seed={c.id} className="h-full w-full !rounded-none" />
      ))}
    </div>
  );
}

export function PlaylistCard({ playlist, fluid }: { playlist: Playlist; fluid?: boolean }) {
  const { resolve } = useLibrary();
  const { queue, current, isPlaying } = usePlayerState();
  const { playList, toggle } = usePlayerActions();
  const songs = resolve(playlist.songIds);
  const active = !!current && songs.length > 0 && queue.length === songs.length && songs.every((s) => queue.some((q) => q.id === s.id)) && songs.some((s) => s.id === current.id);
  return (
    <div className={cn(fluid ? 'group relative w-full' : CARD)}>
      <Link to={`/playlist/${playlist.id}`} className="block rounded-2xl p-2 transition hover:bg-line/5">
        <PlaylistArt playlist={playlist} className="w-full shadow-lg shadow-black/30" />
        <p className={cn('mt-3 truncate text-sm font-semibold', active && 'text-brand')}>{playlist.name}</p>
        <p className="truncate text-xs text-muted">{playlist.virtual ? playlist.description : `Playlist · ${pluralize(songs.length, 'song')}`}</p>
      </Link>
      {songs.length > 0 && (
        <PlayOverlay playing={active && isPlaying} label={`${active && isPlaying ? 'Pause' : 'Play'} playlist ${playlist.name}`} onClick={() => (active ? toggle() : playList(songs))} />
      )}
    </div>
  );
}
