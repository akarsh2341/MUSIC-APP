import type { Album, Artist, Playlist, Song } from '../types';
import { makeArtistImage } from './art';
import { daySeed, seededShuffle, slugify } from './utils';

export const albumIdOf = (s: Pick<Song, 'artist' | 'album'>) => `${slugify(s.artist)}--${slugify(s.album)}`;
export const artistIdOf = (s: Pick<Song, 'artist'>) => slugify(s.artist);

export interface LibraryIndex {
  songById: Map<string, Song>;
  albums: Album[];
  artists: Artist[];
  albumById: Map<string, Album>;
  artistById: Map<string, Artist>;
}

/** Derives albums and artists from the flat song list so uploads are grouped automatically. */
export function buildIndex(songs: Song[]): LibraryIndex {
  const songById = new Map<string, Song>();
  const albumById = new Map<string, Album>();
  const artistById = new Map<string, Artist>();

  for (const s of songs) {
    songById.set(s.id, s);

    const albumId = albumIdOf(s);
    const artistId = artistIdOf(s);

    let album = albumById.get(albumId);
    if (!album) {
      album = {
        id: albumId,
        title: s.album,
        artist: s.artist,
        artistId,
        artwork: s.artwork,
        year: s.year,
        songIds: [],
        addedAt: s.addedAt,
      };
      albumById.set(albumId, album);
    }
    album.songIds.push(s.id);
    album.addedAt = Math.max(album.addedAt, s.addedAt);

    let artist = artistById.get(artistId);
    if (!artist) {
      artist = { id: artistId, name: s.artist, image: makeArtistImage(s.artist), songIds: [], albumIds: [] };
      artistById.set(artistId, artist);
    }
    artist.songIds.push(s.id);
    if (!artist.albumIds.includes(albumId)) artist.albumIds.push(albumId);
  }

  return {
    songById,
    albumById,
    artistById,
    albums: Array.from(albumById.values()),
    artists: Array.from(artistById.values()),
  };
}

export interface HistoryEntry {
  id: string;
  at: number;
}

/**
 * Auto-generated "personalised" mixes. They are virtual (derived from taste + the date) and
 * can be saved as a real playlist from the playlist page.
 */
export function buildMixes(songs: Song[], likedIds: string[], history: HistoryEntry[]): Playlist[] {
  if (!songs.length) return [];
  const seed = daySeed();
  const mixes: Playlist[] = [];
  const mk = (id: string, name: string, description: string, ids: string[]) => {
    if (ids.length) mixes.push({ id, name, description, songIds: ids, createdAt: 0, updatedAt: 0, virtual: true });
  };

  // Weight genres by plays + likes so mixes lean toward what the listener actually enjoys.
  const byId = new Map(songs.map((s) => [s.id, s] as const));
  const weight = new Map<string, number>();
  const bump = (id: string, w: number) => {
    const g = byId.get(id)?.genre;
    if (g) weight.set(g, (weight.get(g) || 0) + w);
  };
  history.forEach((h) => bump(h.id, 1));
  likedIds.forEach((id) => bump(id, 3));
  const allGenres = Array.from(new Set(songs.map((s) => s.genre).filter(Boolean))) as string[];
  const genres = allGenres.sort((a, b) => (weight.get(b) || 0) - (weight.get(a) || 0) || a.localeCompare(b));

  genres.slice(0, 3).forEach((g, i) => {
    const ids = songs.filter((s) => s.genre === g).map((s) => s.id);
    mk(`mix-genre-${slugify(g)}`, `Daily Mix ${i + 1}`, `${g} and more, refreshed daily`, seededShuffle(ids, seed + i));
  });

  const played = new Set(history.map((h) => h.id));
  const fresh = songs.filter((s) => !played.has(s.id)).map((s) => s.id);
  mk('mix-discover', 'Discover Mix', 'Tracks you have not played yet', seededShuffle(fresh, seed + 7));

  const counts = new Map<string, number>();
  history.forEach((h) => counts.set(h.id, (counts.get(h.id) || 0) + 1));
  const repeat = Array.from(counts.entries())
    .filter(([id]) => byId.has(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([id]) => id);
  if (repeat.length >= 3) mk('mix-repeat', 'On Repeat', 'The songs you keep coming back to', repeat);

  return mixes;
}
