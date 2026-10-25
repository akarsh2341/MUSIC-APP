import { ListMusic, ListPlus, Trash2, X } from 'lucide-react';
import { usePlayerActions, usePlayerState } from '../context/PlayerContext';
import { useUI } from '../context/UIContext';
import { useReorder } from '../lib/useReorder';
import { formatTotal, totalDuration } from '../lib/utils';
import { SongRow } from './SongRow';
import { EmptyState } from './ui';

export function QueuePanel() {
  const { queueOpen, setQueueOpen, openCreatePlaylist } = useUI();
  const { queue, index, current } = usePlayerState();
  const { jumpTo, removeFromQueue, moveInQueue, clearQueue } = usePlayerActions();
  const { propsFor, dragIndex, overIndex } = useReorder(moveInQueue);

  if (!queueOpen) return null;

  const upcoming = queue.slice(index + 1);
  const played = queue.slice(0, Math.max(index, 0));
  const reorderFor = (abs: number) => ({ index: abs, count: queue.length, onMove: moveInQueue, dndProps: propsFor(abs) as Record<string, unknown>, isDragging: dragIndex === abs, isOver: overIndex === abs });
  const remove = (abs: number) => [{ label: 'Remove from queue', icon: <X />, onClick: () => removeFromQueue(abs) }];

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-fadeIn" onClick={() => setQueueOpen(false)} aria-hidden="true" />
      <aside role="dialog" aria-label="Play queue" className="absolute inset-y-0 right-0 flex w-full animate-slideLeft flex-col border-l border-line/10 bg-surface shadow-2xl sm:w-[430px]">
        <div className="flex items-center gap-2 px-5 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold">Queue</h2>
            <p className="text-xs text-muted">
              {queue.length} {queue.length === 1 ? 'song' : 'songs'} · {formatTotal(totalDuration(queue))}
            </p>
          </div>
          <button className="icon-btn" disabled={!queue.length} onClick={() => openCreatePlaylist(queue.map((s) => s.id))} aria-label="Save queue as playlist" title="Save queue as playlist">
            <ListPlus className="h-5 w-5" />
          </button>
          <button className="icon-btn" disabled={queue.length < 2} onClick={clearQueue} aria-label="Clear upcoming songs" title="Clear queue">
            <Trash2 className="h-5 w-5" />
          </button>
          <button className="icon-btn" onClick={() => setQueueOpen(false)} aria-label="Close queue">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
          {!queue.length || !current ? (
            <EmptyState className="mt-6" icon={<ListMusic className="h-6 w-6" />} title="Your queue is empty" message="Play a song, or use “Add to queue” from any song's menu." />
          ) : (
            <>
              <h3 className="px-2 pb-1 pt-2 text-xs font-bold uppercase tracking-wider text-muted">Now playing</h3>
              <SongRow song={current} index={index} list={queue} showAlbum={false} showIndex={false} isCurrentOverride />

              <h3 className="px-2 pb-1 pt-5 text-xs font-bold uppercase tracking-wider text-muted">Next up</h3>
              {upcoming.length === 0 ? (
                <p className="px-2 py-3 text-sm text-muted">Nothing else in the queue. Add songs to keep the music going.</p>
              ) : (
                upcoming.map((s, i) => {
                  const abs = index + 1 + i;
                  return <SongRow key={`${abs}-${s.id}`} song={s} index={abs} list={queue} showAlbum={false} showIndex={false} isCurrentOverride={false} onPlayOverride={() => jumpTo(abs)} reorder={reorderFor(abs)} extraMenu={remove(abs)} />;
                })
              )}

              {played.length > 0 && (
                <>
                  <h3 className="px-2 pb-1 pt-5 text-xs font-bold uppercase tracking-wider text-muted">Played</h3>
                  {played.map((s, i) => (
                    <SongRow key={`${i}-${s.id}`} song={s} index={i} list={queue} showAlbum={false} showIndex={false} isCurrentOverride={false} onPlayOverride={() => jumpTo(i)} reorder={reorderFor(i)} extraMenu={remove(i)} />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
