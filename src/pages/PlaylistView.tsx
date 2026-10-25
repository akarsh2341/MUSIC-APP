import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ListMusic, ListPlus, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { MenuButton } from '../components/MenuButton';
import { PlaylistArt } from '../components/Cards';
import { CollectionHeader, PlayShuffleButtons, SongList, SortSelect, type SortValue } from '../components/SongList';
import { EmptyState, PageSkeleton } from '../components/ui';
import { useLibrary } from '../context/LibraryContext';
import { usePlayerActions } from '../context/PlayerContext';
import { useUI } from '../context/UIContext';
import { toast, toastSuccess } from '../lib/toast';
import { formatTotal, pluralize, seededShuffle, sortSongs, totalDuration } from '../lib/utils';

export default function PlaylistView() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const lib = useLibrary();
  const { addToQueue } = usePlayerActions();
  const { openRenamePlaylist, confirm } = useUI();
  const [sort, setSort] = useState<SortValue>('custom');

  const playlist = lib.getPlaylist(id);
  const songs = useMemo(() => (playlist ? lib.resolve(playlist.songIds) : []), [playlist, lib]);
  const shown = useMemo(() => (sort === 'custom' ? songs : sortSongs(songs, sort)), [songs, sort]);

  // Songs that could be added: not already in the playlist, shuffled per playlist so each looks different.
  const suggestions = useMemo(() => {
    if (!playlist || playlist.virtual) return [];
    const inList = new Set(playlist.songIds);
    return seededShuffle(lib.songs.filter((s) => !inList.has(s.id)), playlist.createdAt || 1).slice(0, 5);
  }, [playlist, lib.songs]);

  if (!lib.ready) return <PageSkeleton />;

  if (!playlist) {
    return (
      <EmptyState
        className="mt-6"
        icon={<ListMusic className="h-6 w-6" />}
        title="Playlist not found"
        message="It may have been deleted, or the daily mix has changed."
        action={
          <Link to="/library?tab=playlists" className="btn-primary">
            Go to playlists
          </Link>
        }
      />
    );
  }

  const isVirtual = !!playlist.virtual;
  const canReorder = !isVirtual && sort === 'custom';

  const saveMix = () => {
    const pl = lib.createPlaylist(playlist.name, playlist.songIds);
    toastSuccess(`Saved "${pl.name}" to your playlists`);
    navigate(`/playlist/${pl.id}`, { replace: true });
  };

  const remove = () =>
    confirm({
      title: `Delete "${playlist.name}"?`,
      message: 'This playlist will be permanently deleted. The songs stay in your library.',
      confirmLabel: 'Delete playlist',
      danger: true,
      onConfirm: () => {
        lib.deletePlaylist(playlist.id);
        navigate('/library?tab=playlists', { replace: true });
        toast(`Deleted "${playlist.name}"`);
      },
    });

  return (
    <div className="pb-8 pt-1">
      <CollectionHeader
        art={<PlaylistArt playlist={playlist} />}
        kind={isVirtual ? 'Made for you' : 'Playlist'}
        title={playlist.name}
        meta={
          <>
            {playlist.description && <p className="mb-1">{playlist.description}</p>}
            {pluralize(songs.length, 'song')}
            {songs.length > 0 && ` · ${formatTotal(totalDuration(songs))}`}
          </>
        }
        actions={
          <>
            <PlayShuffleButtons songs={shown} />
            {isVirtual ? (
              <button className="btn-ghost !py-3" onClick={saveMix}>
                <Save className="h-4 w-4" /> Save as playlist
              </button>
            ) : (
              <MenuButton
                label="Playlist options"
                className="h-12 w-12 border border-line/15"
                items={[
                  { label: 'Rename', icon: <Pencil />, onClick: () => openRenamePlaylist(playlist) },
                  { label: 'Add all to queue', icon: <ListPlus />, disabled: !songs.length, onClick: () => addToQueue(songs) },
                  { label: 'Delete playlist', icon: <Trash2 />, danger: true, separatorBefore: true, onClick: remove },
                ]}
              />
            )}
          </>
        }
      />

      {songs.length === 0 ? (
        <EmptyState icon={<ListMusic className="h-6 w-6" />} title="This playlist is empty" message="Add songs below, or use “Add to playlist” from any song's menu." />
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted">{canReorder ? 'Drag rows to reorder, or use “Move up / Move down” in the ⋯ menu.' : isVirtual ? 'Save this mix to edit it.' : 'Switch to “Custom order” to reorder.'}</p>
            <SortSelect value={sort} onChange={setSort} allowCustom />
          </div>
          <SongList
            songs={shown}
            onMove={canReorder ? (from, to) => lib.reorderPlaylist(playlist.id, from, to) : undefined}
            extraMenuFor={
              isVirtual
                ? undefined
                : (s) => [
                    {
                      label: 'Remove from this playlist',
                      icon: <X />,
                      onClick: () => {
                        lib.removeFromPlaylist(playlist.id, s.id);
                        toast(`Removed "${s.title}"`, 'info', { label: 'Undo', onClick: () => lib.addToPlaylist(playlist.id, [s.id]) });
                      },
                    },
                  ]
            }
          />
        </>
      )}

      {!isVirtual && suggestions.length > 0 && (
        <section className="mt-10" aria-label="Add songs">
          <h2 className="text-xl font-bold">Add songs</h2>
          <p className="mb-3 text-sm text-muted">Quick picks from your library</p>
          <ul className="divide-y divide-line/5">
            {suggestions.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-2">
                <img src={s.artwork} alt="" className="h-11 w-11 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s.title}</p>
                  <p className="truncate text-xs text-muted">
                    {s.artist} · {s.album}
                  </p>
                </div>
                <button
                  className="btn-ghost !py-1.5"
                  onClick={() => {
                    lib.addToPlaylist(playlist.id, [s.id]);
                    toastSuccess(`Added "${s.title}"`);
                  }}
                  aria-label={`Add ${s.title} to ${playlist.name}`}
                >
                  <Plus className="h-4 w-4" /> Add
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
