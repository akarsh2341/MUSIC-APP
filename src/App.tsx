import { useEffect, useRef } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Dialogs } from './components/Dialogs';
import { MobileNavigation } from './components/MobileNavigation';
import { MusicPlayer } from './components/MusicPlayer';
import { Sidebar } from './components/Sidebar';
import { Toasts } from './components/Toasts';
import { TopBar } from './components/TopBar';
import { EmptyState } from './components/ui';
import { APP_NAME } from './config';
import HomePage from './pages/HomePage';
import LibraryView from './pages/LibraryView';
import PlaylistView from './pages/PlaylistView';
import SearchPage from './pages/SearchPage';
import SettingsPage from './pages/SettingsPage';
import { AlbumPage, ArtistPage } from './pages/DetailPages';

const TITLES: Record<string, string> = { '/': 'Home', '/search': 'Search', '/library': 'Your Library', '/settings': 'Settings' };

export default function App() {
  const { pathname } = useLocation();
  const main = useRef<HTMLElement>(null);

  // Start every page at the top, and keep the tab title meaningful.
  useEffect(() => {
    main.current?.scrollTo({ top: 0 });
    const base = pathname.split('/')[1];
    document.title = `${TITLES[pathname] ?? (base ? base[0].toUpperCase() + base.slice(1) : 'Home')} · ${APP_NAME}`;
  }, [pathname]);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-bg">
      <a href="#main" className="sr-only z-[200] rounded-md bg-brand px-3 py-2 text-white focus:not-sr-only focus:absolute focus:left-2 focus:top-2">
        Skip to content
      </a>
      <div className="relative flex min-h-0 flex-1">
        {/* ambient glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-brand/15 to-transparent" aria-hidden="true" />
        <Sidebar />
        <div className="relative flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main id="main" ref={main} tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto px-4 outline-none md:px-8">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/library" element={<LibraryView />} />
              <Route path="/album/:id" element={<AlbumPage />} />
              <Route path="/artist/:id" element={<ArtistPage />} />
              <Route path="/playlist/:id" element={<PlaylistView />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route
                path="*"
                element={
                  <EmptyState
                    className="mt-8"
                    icon={<Compass className="h-6 w-6" />}
                    title="Page not found"
                    message="That page doesn't exist."
                    action={
                      <Link to="/" className="btn-primary">
                        Back to Home
                      </Link>
                    }
                  />
                }
              />
            </Routes>
          </main>
        </div>
      </div>
      <MusicPlayer />
      <MobileNavigation />
      <Dialogs />
      <Toasts />
    </div>
  );
}
