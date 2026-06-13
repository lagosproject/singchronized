import { Layers, Music, Settings, Trash2 } from 'lucide-react';
import { useApp } from '../../context/app-context';
import { API_BASE } from '../../config';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { playlists, queue } = useApp();
  const { selectedPlaylist, setSelectedPlaylist } = playlists;

  return (
    <aside className="glass-panel" style={{ width: '300px', display: 'flex', flexDirection: 'column', margin: '20px', padding: '24px', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
          <img src="/logo.svg" alt="SingChronized Logo" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, background: 'linear-gradient(to right, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            SingChronized
          </h2>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={() => setActiveTab('home')}
          className={`interactive-btn ${activeTab === 'home' ? '' : 'secondary-btn'}`}
          style={{ justifyContent: 'flex-start', width: '100%' }}
        >
          <Music size={18} />
          Home
        </button>

        <button
          onClick={() => setActiveTab('studio')}
          className={`interactive-btn ${activeTab === 'studio' ? '' : 'secondary-btn'}`}
          style={{ justifyContent: 'flex-start', width: '100%' }}
        >
          <Layers size={18} />
          Ingestion & Processing
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`interactive-btn ${activeTab === 'settings' ? '' : 'secondary-btn'}`}
          style={{ justifyContent: 'flex-start', width: '100%' }}
        >
          <Settings size={18} />
          Settings
        </button>
      </nav>

      {/* Playlists section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', flex: 1, overflowY: 'auto' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Playlists</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {playlists.playlists.map(p => (
            <button
              key={p.name}
              onClick={() => {
                setSelectedPlaylist(p);
                setActiveTab('home');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                background: selectedPlaylist?.name === p.name ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: 'none',
                color: selectedPlaylist?.name === p.name ? 'white' : 'var(--text-secondary)',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: selectedPlaylist?.name === p.name ? 700 : 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {p.thumbnail_url ? (
                <img src={`${API_BASE}${p.thumbnail_url}`} alt="" style={{ width: '16px', height: '16px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <Music size={14} color="var(--primary)" />
              )}
              {p.name}
            </button>
          ))}
          {playlists.playlists.length === 0 && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingLeft: '12px' }}>No playlists yet</span>
          )}
        </div>
      </div>

      {/* Karaoke Queue section */}
      {queue.queue.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', maxHeight: '200px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Karaoke Queue</span>
            <button
              onClick={queue.clearQueue}
              style={{ background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}
            >
              Clear
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {queue.queue.map((song, qIdx) => (
              <div
                key={`${song.id}_${qIdx}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  background: queue.currentQueueIndex === qIdx ? 'rgba(139,92,246,0.1)' : 'transparent',
                  fontSize: '0.8rem',
                  color: queue.currentQueueIndex === qIdx ? 'white' : 'var(--text-secondary)',
                  overflow: 'hidden'
                }}
              >
                <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', flex: 1, paddingRight: '8px' }}>
                  <strong style={{ display: 'block', fontSize: '0.8rem', color: queue.currentQueueIndex === qIdx ? 'var(--primary)' : 'white', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</strong>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{song.artist}</span>
                </div>
                {queue.currentQueueIndex === qIdx ? (
                  <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 700 }}>Playing</span>
                ) : (
                  <button
                    onClick={() => queue.removeFromQueue(qIdx)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
