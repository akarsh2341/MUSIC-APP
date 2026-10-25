import { NavLink } from 'react-router-dom';
import { Home, Library, Search, Settings } from 'lucide-react';
import { cn } from '../lib/utils';

const items = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/library', label: 'Library', icon: Library },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function MobileNavigation() {
  return (
    <nav className="safe-bottom z-30 flex shrink-0 border-t border-line/10 bg-surface/95 backdrop-blur md:hidden" aria-label="Main">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => cn('flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors', isActive ? 'text-brand' : 'text-muted')}>
          <Icon className="h-5 w-5" aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
