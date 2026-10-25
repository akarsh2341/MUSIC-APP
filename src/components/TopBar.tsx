import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Moon, Sun, Upload } from 'lucide-react';
import { useUI } from '../context/UIContext';
import { Logo } from './Logo';
import { SearchBar } from './SearchBar';

export function TopBar() {
  const navigate = useNavigate();
  const { theme, toggleTheme, pickFiles } = useUI();
  return (
    <header className="z-20 flex shrink-0 items-center gap-3 px-4 py-3 md:px-8 md:py-4">
      <div className="md:hidden">
        <Logo />
      </div>
      <div className="hidden gap-1 md:flex">
        <button className="icon-btn bg-line/5" onClick={() => navigate(-1)} aria-label="Go back">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button className="icon-btn bg-line/5" onClick={() => navigate(1)} aria-label="Go forward">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="mx-auto hidden w-full max-w-xl md:block">
        <SearchBar id="global-search" />
      </div>
      <div className="ml-auto flex items-center gap-1">
        <button className="btn-ghost hidden !py-2 lg:inline-flex" onClick={pickFiles}>
          <Upload className="h-4 w-4" /> Add music
        </button>
        <button className="icon-btn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>
    </header>
  );
}
