import type { Song } from '../types';
import { makeCover } from '../lib/art';

/**
 * Demo catalog.
 *
 * Audio: the 16 tracks are the "SoundHelix" example songs (https://www.soundhelix.com), which
 * are algorithmically generated and published for free use in demos and prototypes.
 * The artist / album / title metadata below is fictional demo data, and the artwork is
 * generated locally (see src/lib/art.ts), so nothing here is copyrighted streaming content.
 *
 * To use your own music, either drag files in through the "Add music" button (stored locally in the
 * browser), or replace the entries below. Each song needs: id, title, artist, album, artwork,
 * duration (seconds, corrected automatically from the real audio metadata) and audioUrl.
 */
const AUDIO_BASE = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-';
const EPOCH = Date.UTC(2026, 8, 1);
const DAY = 86_400_000;

interface RawTrack {
  n: number;
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: number;
  duration: number;
  popularity: number;
}

const RAW: RawTrack[] = [
  { n: 1, title: 'Golden Hour Drift', artist: 'Neon Harbor', album: 'Afterglow', genre: 'Synthwave', year: 2025, duration: 372, popularity: 96 },
  { n: 2, title: 'Velvet Skyline', artist: 'Neon Harbor', album: 'Afterglow', genre: 'Synthwave', year: 2025, duration: 344, popularity: 91 },
  { n: 3, title: 'Last Train to Eden', artist: 'Neon Harbor', album: 'Afterglow', genre: 'Electronic', year: 2025, duration: 297, popularity: 84 },
  { n: 4, title: 'Paper Lanterns', artist: 'Luna Vale', album: 'Paper Lanterns', genre: 'Indie', year: 2024, duration: 305, popularity: 88 },
  { n: 5, title: 'Slow Tide', artist: 'Luna Vale', album: 'Paper Lanterns', genre: 'Chill', year: 2024, duration: 347, popularity: 79 },
  { n: 6, title: 'Honey & Static', artist: 'Luna Vale', album: 'Paper Lanterns', genre: 'Indie', year: 2024, duration: 364, popularity: 82 },
  { n: 7, title: 'Circuit Bloom', artist: 'Kairo Static', album: 'Static Bloom', genre: 'Electronic', year: 2026, duration: 325, popularity: 93 },
  { n: 8, title: 'Glasswork', artist: 'Kairo Static', album: 'Static Bloom', genre: 'Electronic', year: 2026, duration: 353, popularity: 77 },
  { n: 9, title: 'Pulse Garden', artist: 'Kairo Static', album: 'Static Bloom', genre: 'Electronic', year: 2026, duration: 330, popularity: 86 },
  { n: 10, title: 'Weightless', artist: 'Orbital Dreams', album: 'Quiet Orbit', genre: 'Ambient', year: 2023, duration: 321, popularity: 74 },
  { n: 11, title: 'Moon Dust Letters', artist: 'Orbital Dreams', album: 'Quiet Orbit', genre: 'Ambient', year: 2023, duration: 330, popularity: 70 },
  { n: 12, title: 'Aurora Protocol', artist: 'Orbital Dreams', album: 'Quiet Orbit', genre: 'Cinematic', year: 2023, duration: 347, popularity: 81 },
  { n: 13, title: 'Compass Rose', artist: 'Midnight Cartographers', album: 'Cartography', genre: 'Cinematic', year: 2025, duration: 296, popularity: 89 },
  { n: 14, title: 'Uncharted Waters', artist: 'Midnight Cartographers', album: 'Cartography', genre: 'Cinematic', year: 2025, duration: 330, popularity: 83 },
  { n: 15, title: 'Orchid Hour', artist: 'Pale Orchid', album: 'Orchid Hours', genre: 'Chill', year: 2026, duration: 308, popularity: 90 },
  { n: 16, title: 'Soft Machines', artist: 'Pale Orchid', album: 'Orchid Hours', genre: 'Chill', year: 2026, duration: 411, popularity: 76 },
];

export const CATALOG: Song[] = RAW.map((r, i) => ({
  id: `sh-${r.n}`,
  title: r.title,
  artist: r.artist,
  album: r.album,
  artwork: makeCover(`${r.artist}|${r.album}`),
  duration: r.duration,
  audioUrl: `${AUDIO_BASE}${r.n}.mp3`,
  addedAt: EPOCH + i * 3 * DAY,
  source: 'catalog',
  genre: r.genre,
  year: r.year,
  popularity: r.popularity,
}));
