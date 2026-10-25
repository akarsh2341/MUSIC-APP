import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibrary } from '../context/LibraryContext';
import { usePlayerActions, usePlayerState } from '../context/PlayerContext';
import { useUI } from '../context/UIContext';
import { FullScreenPlayer } from './FullScreenPlayer';
import { MiniPlayer } from './MiniPlayer';
import { QueuePanel } from './QueuePanel';

/**
 * The player "shell": mini player, full-screen player, queue panel and global keyboard shortcuts.
 * The actual <audio> element and queue logic live in PlayerContext, so this component can
 * mount/unmount panels freely without ever interrupting playback.
 */
export function MusicPlayer() {
  const player = usePlayerActions();
  const { current, volume } = usePlayerState();
  const { toggleLike } = useLibrary();
  const ui = useUI();
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      const isRange = tag === 'INPUT' && (el as HTMLInputElement).type === 'range';
      const typing = (tag === 'INPUT' && !isRange) || tag === 'TEXTAREA' || tag === 'SELECT' || !!el?.isContentEditable;
      if (typing) return;
      if (document.querySelector('[data-modal]')) return; // dialogs own the keyboard
      const onButton = tag === 'BUTTON' || tag === 'A' || tag === 'SUMMARY' || el?.getAttribute('role') === 'menuitem';

      switch (e.key) {
        case 'Escape':
          if (ui.queueOpen) ui.setQueueOpen(false);
          else if (ui.fullScreenOpen) ui.setFullScreenOpen(false);
          return;
        case ' ':
          if (onButton) return; // let the focused button activate natively
          e.preventDefault();
          player.toggle();
          return;
        case 'k':
        case 'K':
          player.toggle();
          return;
        case 'ArrowRight':
          if (isRange) return;
          e.preventDefault();
          e.shiftKey ? player.next() : player.seekBy(5);
          return;
        case 'ArrowLeft':
          if (isRange) return;
          e.preventDefault();
          e.shiftKey ? player.prev() : player.seekBy(-5);
          return;
        case 'ArrowUp':
          if (isRange) return;
          e.preventDefault();
          player.setVolume(volume + 0.05);
          return;
        case 'ArrowDown':
          if (isRange) return;
          e.preventDefault();
          player.setVolume(volume - 0.05);
          return;
        case 'n':
        case 'N':
          player.next();
          return;
        case 'p':
        case 'P':
          player.prev();
          return;
        case 'm':
        case 'M':
          player.toggleMute();
          return;
        case 's':
        case 'S':
          player.toggleShuffle();
          return;
        case 'r':
        case 'R':
          player.cycleRepeat();
          return;
        case 'l':
        case 'L':
          if (current) toggleLike(current.id);
          return;
        case 'q':
        case 'Q':
          ui.setQueueOpen(!ui.queueOpen);
          return;
        case 'f':
        case 'F':
          if (current) ui.setFullScreenOpen(!ui.fullScreenOpen);
          return;
        case '/': {
          e.preventDefault();
          ui.setFullScreenOpen(false);
          const input = document.getElementById('global-search') as HTMLInputElement | null;
          if (input && input.offsetParent !== null) input.focus();
          else navigate('/search');
          return;
        }
        case '?':
          ui.setShortcutsOpen(true);
          return;
        default:
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [player, ui, volume, current, toggleLike, navigate]);

  return (
    <>
      <MiniPlayer />
      <FullScreenPlayer />
      <QueuePanel />
    </>
  );
}
