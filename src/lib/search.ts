import type { Album, Artist, Playlist, Song } from '../types';
import { normalize } from './utils';

export interface SearchData {
  songs: Song[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
}

export interface SearchResults {
  songs: Song[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
  total: number;
}

/** 3 = starts with, 2 = a word starts with, 1 = contains, 0 = no match. All tokens must match. */
function score(haystack: string, tokens: string[]): number {
  const h = normalize(haystack);
  let total = 0;
  for (const t of tokens) {
    if (h.startsWith(t)) total += 3;
    else if (h.includes(` ${t}`)) total += 2;
    else if (h.includes(t)) total += 1;
    else return 0;
  }
  return total;
}

function rank<T>(items: T[], fn: (item: T) => number): T[] {
  return items
    .map((item) => ({ item, s: fn(item) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.item);
}

export function runSearch(query: string, data: SearchData): SearchResults {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return { songs: [], albums: [], artists: [], playlists: [], total: 0 };

  const songs = rank(data.songs, (s) =>
    Math.max(score(s.title, tokens) * 2, score(`${s.title} ${s.artist} ${s.album}`, tokens)),
  );
  const albums = rank(data.albums, (a) => Math.max(score(a.title, tokens) * 2, score(`${a.title} ${a.artist}`, tokens)));
  const artists = rank(data.artists, (a) => score(a.name, tokens));
  const playlists = rank(data.playlists, (p) => score(`${p.name} ${p.description ?? ''}`, tokens));
  return { songs, albums, artists, playlists, total: songs.length + albums.length + artists.length + playlists.length };
}

/** Autocomplete strings (titles, artists, albums) that match what has been typed so far. */
export function suggest(query: string, data: SearchData, limit = 6): string[] {
  const q = normalize(query);
  if (!q) return [];
  const pool = new Set<string>();
  data.artists.forEach((a) => pool.add(a.name));
  data.albums.forEach((a) => pool.add(a.title));
  data.songs.forEach((s) => {
    pool.add(s.title);
  });
  const matches = Array.from(pool).filter((p) => normalize(p).includes(q) && normalize(p) !== q);
  matches.sort((a, b) => {
    const as = normalize(a).startsWith(q) ? 0 : 1;
    const bs = normalize(b).startsWith(q) ? 0 : 1;
    return as - bs || a.length - b.length;
  });
  return matches.slice(0, limit);
}
