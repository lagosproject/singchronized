import { useApp } from '../../context/app-context';

export default function AddToPlaylistMenu({ song, onClose }) {
  const { playlists, openCreatePlaylistModal } = useApp();

  return (
    <div style={{
      position: 'absolute',
      right: 0,
      top: '20px',
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
      zIndex: 100,
      minWidth: '180px',
      overflow: 'hidden',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)'
    }}>
      <div style={{ padding: '4px 0' }}>
        <span style={{ display: 'block', padding: '6px 12px', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Add to Playlist</span>
        {playlists.playlists.map(p => (
          <button
            key={p.name}
            onClick={(e) => {
              e.stopPropagation();
              playlists.addSongToPlaylist(song.id, p);
              onClose();
            }}
            style={{
              width: '100%',
              padding: '8px 16px',
              textAlign: 'left',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            {p.name}
          </button>
        ))}
        <button
          onClick={(e) => {
            e.stopPropagation();
            openCreatePlaylistModal([song.id]);
            onClose();
          }}
          style={{
            width: '100%',
            padding: '8px 16px',
            textAlign: 'left',
            background: 'transparent',
            border: 'none',
            color: 'var(--primary)',
            fontSize: '0.8rem',
            cursor: 'pointer',
            fontWeight: 600
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          + New Playlist
        </button>
      </div>
    </div>
  );
}
