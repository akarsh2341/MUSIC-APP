import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Disc3, User } from 'lucide-react';
import { AlbumCard } from '../components/Cards';
import { CollectionHeader, PlayShuffleButtons, SongList } from '../components/SongList';
import { Cover, EmptyState, PageSkeleton, SectionHeader } from '../components/ui';
import { useLibrary } from '../context/LibraryContext';
import { formatTotal, pluralize, totalDuration } from '../lib/utils';

export function AlbumPage() {
  const { id = '' } = useParams();
  const { ready, albumById, resolve } = useLibrary();
  const album = albumById.get(id);
  const songs = useMemo(() => (album ? resolve(album.songIds) : []), [album, resolve]);

  if (!ready) return <PageSkeleton />;
  if (!album) {
    return <EmptyState className="mt-6" icon={<Disc3 className="h-6 w-6" />} title="Album not found" message="It may have been removed from your library." action={<Link to="/library?tab=albums" className="btn-primary">Browse albums</Link>} />;
  }
  return (
    <div className="pb-8 pt-1">
      <CollectionHeader
        art={<Cover src={album.artwork} seed={album.id} alt={`${album.title} cover`} eager />}
        kind="Album"
        title={album.title}
        meta={
          <>
            <Link to={`/artist/${album.artistId}`} className="font-semibold text-ink hover:underline">
              {album.artist}
            </Link>
            {album.year ? ` · ${album.year}` : ''} · {pluralize(songs.length, 'song')}, {formatTotal(totalDuration(songs))}
          </>
        }
        actions={<PlayShuffleButtons songs={songs} />}
      />
      <SongList songs={songs} showAlbum={false} />
    </div>
  );
}

export function ArtistPage() {
  const { id = '' } = useParams();
  const { ready, artistById, albumById, resolve } = useLibrary();
  const artist = artistById.get(id);
  const songs = useMemo(() => (artist ? resolve(artist.songIds) : []), [artist, resolve]);
  const popular = useMemo(() => songs.slice().sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).slice(0, 5), [songs]);
  const albums = useMemo(() => (artist ? artist.albumIds.map((a) => albumById.get(a)).filter((a): a is NonNullable<typeof a> => !!a) : []), [artist, albumById]);

  if (!ready) return <PageSkeleton />;
  if (!artist) {
    return <EmptyState className="mt-6" icon={<User className="h-6 w-6" />} title="Artist not found" message="They may have been removed from your library." action={<Link to="/library?tab=artists" className="btn-primary">Browse artists</Link>} />;
  }
  return (
    <div className="pb-8 pt-1">
      <CollectionHeader
        round
        art={<Cover src={artist.image} seed={artist.id} alt={artist.name} round eager />}
        kind="Artist"
        title={artist.name}
        meta={`${pluralize(albums.length, 'album')} · ${pluralize(songs.length, 'song')} · ${formatTotal(totalDuration(songs))}`}
        actions={<PlayShuffleButtons songs={songs} />}
      />

      <section className="mb-9" aria-label="Popular songs">
        <SectionHeader title="Popular" />
        <SongList songs={popular} />
      </section>

      <section className="mb-9" aria-label="Albums">
        <SectionHeader title="Albums" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {albums.map((a) => (
            <AlbumCard key={a.id} album={a} fluid />
          ))}
        </div>
      </section>

      {songs.length > popular.length && (
        <section aria-label="All songs">
          <SectionHeader title="All songs" />
          <SongList songs={songs} />
        </section>
      )}
    </div>
  );
}
