import { NavLink, useLocation } from 'react-router-dom';
import { Clock, Heart, Home, Library, ListMusic, Plus, Search, Settings, Upload } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { useUI } from '../context/UIContext';
import { cn } from '../lib/utils';
import { Logo } from './Logo';
import { PlaylistArt } from './Cards';

const link = ({ isActive }: { isActive: boolean }) =>
  cn('flex items-center gap-3.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors', isActive ? 'bg-line/10 text-ink' : 'text-muted hover:bg-line/5 hover:text-ink');

export function Sidebar() {
  const { playlists, likedIds } = useLibrary();
  const { openCreatePlaylist, pickFiles } = useUI();
  const { pathname, search } = useLocation();
  const tab = new URLSearchParams(search).get('tab');
  const onLibrary = pathname === '/library';

  const sub = (active: boolean) => cn('flex items-center gap-3.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors', active ? 'bg-line/10 text-ink' : 'text-muted hover:bg-line/5 hover:text-ink');

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-line/10 bg-surface/60 md:flex lg:w-72" aria-label="Sidebar">
      <div className="px-5 pb-4 pt-6">
        <NavLink to="/" aria-label="Go to home">
          <Logo />
        </NavLink>
      </div>

      <nav className="space-y-1 px-3" aria-label="Main">
        <NavLink to="/" end className={link}>
          <Home className="h-5 w-5" /> Home
        </NavLink>
        <NavLink to="/search" className={link}>
          <Search className="h-5 w-5" /> Search
        </NavLink>
        <NavLink to="/library" end className={({ isActive }) => link({ isActive: isActive && !tab })}>
          <Library className="h-5 w-5" /> Your Library
        </NavLink>
      </nav>

      <div className="mt-2 space-y-0.5 px-3 pl-6">
        <NavLink to="/library?tab=liked" className={() => sub(onLibrary && tab === 'liked')}>
          <Heart className="h-4 w-4" /> Liked Songs
          {likedIds.length > 0 && <span className="ml-auto text-xs tabular-nums text-muted">{likedIds.length}</span>}
        </NavLink>
        <NavLink to="/library?tab=recent" className={() => sub(onLibrary && tab === 'recent')}>
          <Clock className="h-4 w-4" /> Recently Played
        </NavLink>
      </div>

      <div className="mt-5 flex items-center justify-between px-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Playlists</h2>
        <button className="icon-btn h-8 w-8" onClick={() => openCreatePlaylist()} aria-label="Create playlist">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <nav className="mt-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3" aria-label="Your playlists">
        {playlists.length === 0 && (
          <button onClick={() => openCreatePlaylist()} className="w-full rounded-xl border border-dashed border-line/15 px-3 py-4 text-left text-sm text-muted transition hover:border-brand/50 hover:text-ink">
            <ListMusic className="mb-1 h-5 w-5" />
            Create your first playlist
          </button>
        )}
        {playlists.map((p) => (
          <NavLink key={p.id} to={`/playlist/${p.id}`} className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm transition-colors', isActive ? 'bg-line/10 text-ink' : 'text-muted hover:bg-line/5 hover:text-ink')}>
            <PlaylistArt playlist={p} className="h-9 w-9 shrink-0 !rounded-lg" />
            <span className="truncate font-medium">{p.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="space-y-1 border-t border-line/10 p-3">
        <button onClick={pickFiles} className={cn(link({ isActive: false }), 'w-full')}>
          <Upload className="h-5 w-5" /> Add music
        </button>
        <NavLink to="/settings" className={link}>
          <Settings className="h-5 w-5" /> Settings
        </NavLink>
      </div>
    </aside>
  );
}
