import { FullScreenPlayer } from './FullScreenPlayer';
import { MiniPlayer } from './MiniPlayer';
import { QueuePanel } from './QueuePanel';

/**
 * The player "shell": mini player, full-screen player and queue panel.
 * The actual <audio> element and queue logic live in PlayerContext, so this component can
 * mount/unmount panels freely without ever interrupting playback.
 */
export function MusicPlayer() {
  return (
    <>
      <MiniPlayer />
      <FullScreenPlayer />
      <QueuePanel />
    </>
  );
}
