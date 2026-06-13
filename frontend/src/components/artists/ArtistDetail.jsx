import { useState, useEffect } from 'react';
import { User, Play, ListPlus, Shuffle, FolderPlus } from 'lucide-react';
import { useApp } from '../../context/app-context';
import SongRow from '../songs/SongRow';
import { api } from '../../api/client';
import { API_BASE } from '../../config';

export default function ArtistDetail({ artistName, onClose }) {
  const { library, playSong, queue, openCreatePlaylistModal } = useApp();
  const { songs } = library;
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    let isMounted = true;
    api.getArtistImage(artistName)
      .then(res => {
        if (isMounted && res.image_url) {
          setImageUrl(res.image_url);
        }
      })
      .catch(err => {
        console.error("Error loading artist image:", err);
      });
    return () => { isMounted = false; };
  }, [artistName]);

  const artistSongs = songs.filter(s => s.artist && s.artist.split(',').map(a => a.trim()).includes(artistName));

  const getGradient = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h1 = Math.abs(hash % 360);
    const h2 = (h1 + 40) % 360;
    return `linear-gradient(135deg, hsl(${h1}, 70%, 45%) 0%, hsl(${h2}, 80%, 35%) 100%)`;
  };

  const playAll = async () => {
    if (artistSongs.length === 0) return;
    // Set queue to all songs
    queue.setQueueList(artistSongs, 0);
    // Play the first song
    await playSong(artistSongs[0].id, true);
  };

  const addAllToQueue = () => {
    artistSongs.forEach(song => queue.addToQueue(song));
  };

  const shufflePlay = async () => {
    if (artistSongs.length === 0) return;
    // Shuffle the songs
    const shuffled = [...artistSongs].sort(() => Math.random() - 0.5);
    // Set queue to all shuffled songs
    queue.setQueueList(shuffled, 0);
    // Play the first song of the shuffled list
    await playSong(shuffled[0].id, true);
  };

  const addAllToPlaylist = () => {
    const songIds = artistSongs.map(s => s.id);
    openCreatePlaylistModal(songIds);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap', background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, rgba(139,92,246,0.1) 100%)', padding: '32px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: imageUrl ? 'transparent' : getGradient(artistName), display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
            {imageUrl ? (
              <img 
                src={`${API_BASE}${imageUrl}`} 
                alt={artistName} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              <User size={64} color="white" />
            )}
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Artist</span>
            <h2 style={{ margin: '4px 0', fontSize: '2.5rem', fontWeight: 800, color: 'white' }}>{artistName}</h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{artistSongs.length} {artistSongs.length === 1 ? 'track' : 'tracks'} in your library</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={playAll}
            className="interactive-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            disabled={artistSongs.length === 0}
          >
            <Play size={16} fill="white" /> Play All
          </button>
          <button
            onClick={addAllToQueue}
            className="interactive-btn secondary-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            disabled={artistSongs.length === 0}
          >
            <ListPlus size={16} /> Add to Queue
          </button>
          <button
            onClick={shufflePlay}
            className="interactive-btn secondary-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            disabled={artistSongs.length === 0}
          >
            <Shuffle size={16} /> Shuffle
          </button>
          <button
            onClick={addAllToPlaylist}
            className="interactive-btn secondary-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            disabled={artistSongs.length === 0}
          >
            <FolderPlus size={16} /> Add to Playlist
          </button>
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '16px' }}>Popular Tracks</h3>
        {artistSongs.length === 0 ? (
          <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No tracks found for this artist in your library.
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '8px' }}>
            {artistSongs.map((song, index) => (
              <SongRow
                key={song.id}
                song={song}
                index={index}
                dropdownId={`inline_artist_prof_${song.id}_${index}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
