import { useState, useEffect } from 'react';
import { Layers, Music, Settings, Trash2, Maximize2, Minimize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/app-context';
import { resolveMediaUrl } from '../../config';
import { t } from '../../i18n';

export default function Sidebar({ activeTab, setActiveTab, isFullscreen, toggleFullscreen }) {
  const { playlists, queue } = useApp();
  const { selectedPlaylist, setSelectedPlaylist } = playlists;
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '80px' : '300px');
  }, [isCollapsed]);

  return (
    <aside 
      className="glass-panel" 
      style={{ 
        width: isCollapsed ? '80px' : '300px', 
        display: 'flex', 
        flexDirection: 'column', 
        margin: '20px', 
        padding: isCollapsed ? '24px 12px' : '24px', 
        gap: '24px',
        transition: 'width 0.3s ease, padding 0.3s ease',
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', flexDirection: isCollapsed ? 'column' : 'row', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', gap: '12px', width: '100%' }}>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="interactive-btn secondary-btn"
          style={{ width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}
          title={isCollapsed ? t("expandSidebar") : t("collapseSidebar")}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>

        <button
          onClick={toggleFullscreen}
          className="interactive-btn secondary-btn"
          style={{ width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}
          title={isFullscreen ? t("exitFullscreenTitle") : t("fullscreenTitle")}
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={() => setActiveTab('home')}
          className={`interactive-btn ${activeTab === 'home' ? '' : 'secondary-btn'}`}
          style={{ justifyContent: isCollapsed ? 'center' : 'flex-start', width: '100%', padding: isCollapsed ? '0' : '10px 20px', height: isCollapsed ? '40px' : 'auto' }}
          title={t("home")}
        >
          <Music size={18} style={{ flexShrink: 0 }} />
          {!isCollapsed && <span>{t("home")}</span>}
        </button>

        <button
          onClick={() => setActiveTab('studio')}
          className={`interactive-btn ${activeTab === 'studio' ? '' : 'secondary-btn'}`}
          style={{ justifyContent: isCollapsed ? 'center' : 'flex-start', width: '100%', padding: isCollapsed ? '0' : '10px 20px', height: isCollapsed ? '40px' : 'auto' }}
          title={t("ingestionProcessing")}
        >
          <Layers size={18} style={{ flexShrink: 0 }} />
          {!isCollapsed && <span>{t("ingestionProcessing")}</span>}
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`interactive-btn ${activeTab === 'settings' ? '' : 'secondary-btn'}`}
          style={{ justifyContent: isCollapsed ? 'center' : 'flex-start', width: '100%', padding: isCollapsed ? '0' : '10px 20px', height: isCollapsed ? '40px' : 'auto' }}
          title={t("settings")}
        >
          <Settings size={18} style={{ flexShrink: 0 }} />
          {!isCollapsed && <span>{t("settings")}</span>}
        </button>
      </nav>

      {/* Playlists section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', flex: 1, overflowY: 'auto' }}>
        {!isCollapsed && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{t("playlists")}</span>}
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
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                gap: isCollapsed ? '0' : '8px',
                width: '100%',
                padding: isCollapsed ? '0' : '8px 12px',
                height: isCollapsed ? '40px' : 'auto',
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
              title={p.name}
            >
              {p.thumbnail_url ? (
                <img src={resolveMediaUrl(p.thumbnail_url)} alt="" style={{ width: '16px', height: '16px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <Music size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
              )}
              {!isCollapsed && <span>{p.name}</span>}
            </button>
          ))}
          {playlists.playlists.length === 0 && !isCollapsed && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingLeft: '12px' }}>{t("noPlaylistsYet")}</span>
          )}
        </div>
      </div>

      {/* Karaoke Queue section */}
      {queue.queue.length > 0 && !isCollapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', maxHeight: '200px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{t("karaokeQueue")}</span>
            <button
              onClick={queue.clearQueue}
              style={{ background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}
            >
              {t("clear")}
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
                  <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 700 }}>{t("playing")}</span>
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
