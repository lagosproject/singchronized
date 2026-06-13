import { Mic, Play, ListPlus, Shuffle } from 'lucide-react';
import { useApp } from '../../context/app-context';
import { API_BASE } from '../../config';
import SongRow from '../songs/SongRow';

export default function PlaylistDetail({ playlist }) {
  const { playlists, playSong, queue } = useApp();

  const playAll = async () => {
    if (playlist.songs.length === 0) return;
    // Set queue to all songs in playlist
    queue.setQueueList(playlist.songs, 0);
    // Play the first song
    await playSong(playlist.songs[0].id, true);
  };

  const addAllToQueue = () => {
    playlist.songs.forEach(song => queue.addToQueue(song));
  };

  const shufflePlay = async () => {
    if (playlist.songs.length === 0) return;
    // Shuffle the songs
    const shuffled = [...playlist.songs].sort(() => Math.random() - 0.5);
    // Set queue to all shuffled songs
    queue.setQueueList(shuffled, 0);
    // Play the first song of the shuffled list
    await playSong(shuffled[0].id, true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap', background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, rgba(139,92,246,0.1) 100%)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
            {playlist.thumbnail_url ? (
              <img src={`${API_BASE}${playlist.thumbnail_url}`} alt={playlist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Mic size={40} color="white" />
            )}
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Playlist</span>
            <h2 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 800 }}>{playlist.name}</h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{playlist.songs.length} tracks</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={playAll}
            className="interactive-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            disabled={playlist.songs.length === 0}
          >
            <Play size={16} fill="white" /> Play All
          </button>
          <button
            onClick={addAllToQueue}
            className="interactive-btn secondary-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            disabled={playlist.songs.length === 0}
          >
            <ListPlus size={16} /> Add to Queue
          </button>
          <button
            onClick={shufflePlay}
            className="interactive-btn secondary-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            disabled={playlist.songs.length === 0}
          >
            <Shuffle size={16} /> Shuffle
          </button>
          <button
            onClick={() => playlists.deletePlaylist(playlist.name)}
            className="interactive-btn"
            style={{ background: 'var(--danger)', boxShadow: 'none' }}
          >
            Delete Playlist
          </button>
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '16px' }}>Tracks</h3>
        {playlist.songs.length === 0 ? (
          <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            This playlist is empty. Delete it or create a new one with tracks to get started!
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '8px' }}>
            {playlist.songs.map((song, index) => (
              <SongRow
                key={song.id}
                song={song}
                index={index}
                dropdownId={`inline_pl_${song.id}_${index}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
