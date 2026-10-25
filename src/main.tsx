import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';

import App from './App';
import { LibraryProvider } from './context/LibraryContext';
import { PlayerProvider } from './context/PlayerContext';
import { UIProvider } from './context/UIContext';
import './index.css';

// GitHub Pages has no SPA fallback, so the Pages build sets VITE_HASH_ROUTER=true.
const Router = import.meta.env.VITE_HASH_ROUTER === 'true' ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <LibraryProvider>
        <UIProvider>
          <PlayerProvider>
            <App />
          </PlayerProvider>
        </UIProvider>
      </LibraryProvider>
    </Router>
  </StrictMode>,
);
