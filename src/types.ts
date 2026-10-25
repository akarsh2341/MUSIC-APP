export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  /** URL or data URI of the cover art. */
  artwork: string;
  /** Duration in seconds (corrected at runtime from the real audio metadata). */
  duration: number;
  audioUrl: string;
  /** Epoch ms, used for "recently added" sorting. */
  addedAt: number;
  source: 'catalog' | 'local';
  genre?: string;
  year?: number;
  /** Static demo popularity used for "popular" shelves. */
  popularity?: number;
  mime?: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  artwork: string;
  year?: number;
  songIds: string[];
  addedAt: number;
}

export interface Artist {
  id: string;
  name: string;
  image: string;
  songIds: string[];
  albumIds: string[];
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  songIds: string[];
  createdAt: number;
  updatedAt: number;
  /** Auto-generated mixes are virtual and not persisted. */
  virtual?: boolean;
}

export type RepeatMode = 'off' | 'all' | 'one';
export type SortKey = 'title' | 'artist' | 'recent';
export type ThemeMode = 'dark' | 'light';
