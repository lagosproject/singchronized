import { useState, useEffect } from 'react';
import { User, PlayCircle } from 'lucide-react';
import { api } from '../../api/client';
import { API_BASE } from '../../config';
import { useApp } from '../../context/app-context';

export default function ArtistCard({ artistName, songsCount, onClick }) {
  const [imageUrl, setImageUrl] = useState(null);
  const { library, playSong, queue } = useApp();
  const { songs } = library;

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

  // Generate a premium gradient color based on the artist's name to make each card unique and beautiful
  const getGradient = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h1 = Math.abs(hash % 360);
    const h2 = (h1 + 40) % 360;
    return `linear-gradient(135deg, hsl(${h1}, 70%, 45%) 0%, hsl(${h2}, 80%, 35%) 100%)`;
  };

  const handlePlayClick = async (e) => {
    e.stopPropagation();
    const artistSongs = songs.filter(s => s.artist && s.artist.split(',').map(a => a.trim()).includes(artistName));
    if (artistSongs.length === 0) return;
    queue.setQueueList(artistSongs, 0);
    await playSong(artistSongs[0].id, true);
  };

  return (
    <div className="spotify-card" onClick={onClick} style={{ alignItems: 'center', textAlign: 'center' }}>
      <div 
        className="spotify-card-img" 
        style={{ 
          overflow: 'hidden', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          borderRadius: '50%', 
          aspectRatio: '1',
          width: '120px',
          height: '120px',
          margin: '0 auto',
          background: imageUrl ? 'transparent' : getGradient(artistName),
          boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
          position: 'relative'
        }}
      >
        {imageUrl ? (
          <img 
            src={`${API_BASE}${imageUrl}`} 
            alt={artistName} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        ) : (
          <User size={48} color="rgba(255,255,255,0.9)" />
        )}
        <div className="spotify-card-play" onClick={handlePlayClick} style={{ borderRadius: '50%', width: '36px', height: '36px' }}>
          <PlayCircle size={18} />
        </div>
      </div>
      <div style={{ marginTop: '8px', width: '100%' }}>
        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {artistName}
        </h4>
        <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {songsCount} {songsCount === 1 ? 'song' : 'songs'}
        </p>
      </div>
    </div>
  );
}

