import { Mic, PlayCircle } from 'lucide-react';
import { API_BASE } from '../../config';
import { useApp } from '../../context/app-context';

export default function PlaylistCard({ playlist, onClick }) {
  const { playSong, queue } = useApp();

  const handlePlayClick = async (e) => {
    e.stopPropagation();
    if (!playlist.songs || playlist.songs.length === 0) return;
    queue.setQueueList(playlist.songs, 0);
    await playSong(playlist.songs[0].id, true);
  };

  return (
    <div className="spotify-card" onClick={onClick}>
      <div className="spotify-card-img" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {playlist.thumbnail_url ? (
          <img src={`${API_BASE}${playlist.thumbnail_url}`} alt={playlist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Mic size={32} />
        )}
        <div className="spotify-card-play" onClick={handlePlayClick}>
          <PlayCircle size={20} />
        </div>
      </div>
      <div style={{ overflow: 'hidden' }}>
        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{playlist.name}</h4>
        <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{playlist.songs.length} tracks</p>
      </div>
    </div>
  );
}

