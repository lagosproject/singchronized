import { Mic, PlayCircle, Plus, Music } from 'lucide-react';
import { useApp } from '../../context/app-context';
import AddToPlaylistMenu from './AddToPlaylistMenu';
import { API_BASE } from '../../config';

/**
 * A clickable list row for a song with hover actions (add to queue / add to
 * playlist). `dropdownId` must be unique per rendered list so only one
 * dropdown is open at a time across the app.
 */
export default function SongRow({ song, index, dropdownId, showPendingHint = true, showPlaylistAction = true, hideIndex = false }) {
  const { playSong, queue, activeDropdownSongId, setActiveDropdownSongId } = useApp();
  const isReady = song.split_status === 'COMPLETED' && song.lyrics_status === 'COMPLETED';

  return (
    <div
      className="spotify-row"
      onClick={() => playSong(song.id)}
      style={{
        position: 'relative'
      }}
    >
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '4px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255, 255, 255, 0.05)',
        color: 'var(--primary)',
        flexShrink: 0
      }}>
        {song.thumbnail_url ? (
          <img src={`${API_BASE}${song.thumbnail_url}`} alt={song.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Music size={16} />
        )}
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white' }}>{song.title}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{song.artist}</div>
      </div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'flex-end', marginLeft: 'auto' }}>
        {isReady ? (
          <span style={{ fontSize: '0.75rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Mic size={12} /> Ready
          </span>
        ) : showPendingHint ? (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Click to play
          </span>
        ) : null}

        {/* Hover actions next to status */}
        <div className="song-action-btn" style={{ display: 'flex', gap: '6px', alignItems: 'center', position: 'relative' }}>
          <button
            onClick={(e) => { e.stopPropagation(); queue.addToQueue(song); }}
            title="Add to Queue"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <PlayCircle size={12} />
          </button>
          {showPlaylistAction && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveDropdownSongId(activeDropdownSongId === dropdownId ? null : dropdownId);
              }}
              title="Add to Playlist"
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', position: 'relative', transition: 'color 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              <Plus size={12} />
            </button>
          )}

          {showPlaylistAction && activeDropdownSongId === dropdownId && (
            <AddToPlaylistMenu song={song} onClose={() => setActiveDropdownSongId(null)} />
          )}
        </div>
      </div>
    </div>
  );
}
