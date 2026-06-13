import { Mic, Music, PlayCircle } from 'lucide-react';
import { useApp } from '../../context/app-context';
import { API_BASE } from '../../config';

export default function SongCard({ song, accent = false }) {
  const { playSong } = useApp();

  return (
    <div className="spotify-card" onClick={() => playSong(song.id)}>
      <div className="spotify-card-img" style={{
        ...(accent ? { background: 'linear-gradient(135deg, #1e1b4b 0%, #064e3b 100%)' } : {}),
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {song.thumbnail_url ? (
          <img src={`${API_BASE}${song.thumbnail_url}`} alt={song.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          accent ? <Mic size={32} /> : <Music size={32} />
        )}
        <div className="spotify-card-play" style={accent ? { background: 'var(--primary)', boxShadow: '0 4px 12px var(--primary-glow)' } : undefined}>
          <PlayCircle size={20} />
        </div>
      </div>
      <div style={{ overflow: 'hidden' }}>
        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</h4>
        <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.artist}</p>
      </div>
    </div>
  );
}
