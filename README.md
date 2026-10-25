# VibePlay

A modern, responsive music player built with React, TypeScript, Vite and Tailwind CSS.
Dark by default, with a light theme, a persistent mini-player, a full-screen player, queue
management, playlists, search, and local file upload. It runs entirely in the browser with no
backend, no accounts and no paid APIs.

## Quick start

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173.

| Command             | What it does                          |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Start the dev server with hot reload  |
| `npm run build`     | Type-check and build to `dist/`       |
| `npm run preview`   | Serve the production build locally    |
| `npm run typecheck` | TypeScript check only                 |

The demo tracks stream from the internet, so you need a connection for them to play. Your own
uploaded files work offline.

## Build and host with GitHub

1. Create a new empty repository on GitHub, then push this project:
   ```bash
   git init && git add . && git commit -m "VibePlay"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
2. In the repository go to **Settings > Pages** and set **Source** to **GitHub Actions**.
3. The workflow in `.github/workflows/deploy.yml` type-checks, builds and deploys on every push
   to `main`. Your site appears at `https://<you>.github.io/<repo>/` (see the **Actions** tab).

The Pages build sets `VITE_BASE` and `VITE_HASH_ROUTER` automatically, because Pages serves from
a sub-path and has no single-page-app fallback. Local `npm run dev` is unaffected.

## Features

- **Playback**: play/pause, next/previous, seek bar with time, volume and mute, shuffle, repeat
  (off/all/one), queue management, smooth track changes, media-key and lock-screen controls
  (Media Session API), and a single shared `Audio` instance so playback continues across pages
  and keeps its position when the full-screen player opens or closes.
- **Home**: recently played, recommendations, popular albums and artists, recently added,
  personalised mixes, quick access to the library.
- **Search**: songs, albums, artists and playlists, with live results, suggestions, recent
  searches, loading and empty states.
- **Library**: all songs, albums, artists, playlists, liked songs, recently played, with sorting
  by title, artist or recently added.
- **Playlists**: create, rename, delete, add and remove tracks, drag to reorder, play all, save
  the queue as a playlist.
- **Your own music**: use **Add music** to add MP3 and other browser-supported audio. Files are
  stored in your browser (IndexedDB) and never uploaded anywhere.
- **Persistence**: playlists, likes, history, library and settings survive reloads.
- **Polish**: light and dark themes, five accent colours, toasts, error and retry states for
  unavailable audio, generated artwork that can never 404.
- **Accessibility**: labelled controls, keyboard navigation, focus handling in dialogs.

## Keyboard shortcuts

| Key                     | Action                          |
| ----------------------- | ------------------------------- |
| `Space` / `K`           | Play / pause                    |
| `←` / `→`               | Seek back / forward 5 seconds   |
| `Shift+←` / `Shift+→`   | Previous / next (also `P` / `N`)|
| `↑` / `↓`               | Volume up / down                |
| `M`                     | Mute                            |
| `S`                     | Shuffle                         |
| `R`                     | Cycle repeat                    |
| `L`                     | Like current song               |
| `Q`                     | Open / close queue              |
| `F`                     | Open / close full-screen player |
| `/`                     | Focus search                    |
| `?`                     | Show shortcuts                  |

## Project structure

```
vibeplay/
├── index.html                 # Entry HTML (applies saved theme before first paint)
├── .env.example               # Optional branding overrides
├── tailwind.config.js         # Colours map to CSS variables
├── src/
│   ├── main.tsx               # App bootstrap
│   ├── App.tsx                # Routes and layout shell
│   ├── config.ts              # App name, tagline, accent presets
│   ├── index.css              # Theme variables and shared component classes
│   ├── types.ts               # Song, Album, Playlist, ... types
│   ├── data/catalog.ts        # Centralised demo music data
│   ├── context/
│   │   ├── PlayerContext.tsx  # Audio engine, queue, shuffle/repeat, Media Session
│   │   ├── LibraryContext.tsx # Playlists, likes, history, uploads, persistence
│   │   └── UIContext.tsx      # Theme, accent, panels, dialogs
│   ├── lib/                   # art generator, search, storage, db, utils, toasts
│   ├── components/            # Sidebar, MobileNavigation, TopBar, SearchBar, SongCard,
│   │                          # AlbumCard, PlaylistCard, MusicPlayer, MiniPlayer,
│   │                          # FullScreenPlayer, QueuePanel, dialogs, sliders, ...
│   └── pages/                 # HomePage, SearchPage, LibraryView, PlaylistView,
│                              # DetailPages (album/artist), SettingsPage
└── public/favicon.svg
```

## Customising

- **Name and tagline**: copy `.env.example` to `.env` and set `VITE_APP_NAME` and
  `VITE_APP_TAGLINE`. Restart the dev server.
- **Colours**: edit the CSS variables in `src/index.css` (`--bg`, `--surface`, `--brand`,
  `--accent`, ...), or add a preset to `ACCENTS` in `src/config.ts`.
- **Music**: edit `src/data/catalog.ts`. Each song needs `id`, `title`, `artist`, `album`,
  `artwork`, `duration` (seconds; corrected from the real file's metadata once loaded) and
  `audioUrl`.

## Music and licensing

The 16 demo tracks are the "SoundHelix" example songs from https://www.soundhelix.com, which are
algorithmically generated and published for free use in demos. Artist, album and title names are
fictional, and all artwork is generated locally. VibePlay does **not** include a commercial music
catalogue. To offer one you would need to integrate a licensed provider. Don't point `audioUrl`
at copyrighted streams you aren't authorised to use.

## Notes

- Everything is stored per browser. Clearing site data removes playlists and uploaded files.
- Background playback depends on the browser and OS. It works on current desktop browsers and
  on mobile browsers that allow audio to continue when the tab is hidden.
- No backend or Supabase is used because nothing here needs cloud sync. Playlists live in
  IndexedDB and could be moved to Supabase later behind `LibraryContext`.
