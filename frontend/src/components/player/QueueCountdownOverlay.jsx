import { useApp } from '../../context/app-context';
import { API_BASE } from '../../config';
import { ArrowLeft, ArrowRight, Music } from 'lucide-react';

export default function QueueCountdownOverlay() {
  const { queue } = useApp();
  const { 
    queue: songs, 
    currentQueueIndex, 
    isTransitioning, 
    transitionCountdown, 
    playNextInQueue, 
    cancelCountdown,
    playPast,
    playNextOfNext
  } = queue;

  if (!isTransitioning || songs.length === 0 || currentQueueIndex === null || currentQueueIndex >= songs.length - 1) {
    return null;
  }

  const nextSong = songs[currentQueueIndex + 1];
  const pastSong = currentQueueIndex >= 0 && currentQueueIndex < songs.length ? songs[currentQueueIndex] : null;
  const nextOfNextSong = currentQueueIndex + 2 < songs.length ? songs[currentQueueIndex + 2] : null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(3, 7, 18, 0.9)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      zIndex: 1200,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      padding: '24px',
      gap: '32px',
      overflow: 'hidden'
    }}>
      {/* Blurred Album Artwork Background */}
      {nextSong && nextSong.thumbnail_url && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${API_BASE}${nextSong.thumbnail_url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(40px) brightness(0.25)',
          opacity: 0.7,
          zIndex: -1,
          transform: 'scale(1.1)'
        }} />
      )}

      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 1 }}>
        <span style={{ fontSize: '1rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Up Next</span>
        <h2 style={{ margin: 0, fontSize: '3rem', fontWeight: 900 }}>{nextSong.title}</h2>
        <p style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-secondary)' }}>{nextSong.artist}</p>
      </div>

      {/* Row containing Past Button, Countdown Circle, and Next of Next Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '48px', margin: '24px 0', width: '100%', maxWidth: '900px', justifyContent: 'center', zIndex: 1 }}>
        {/* Past Song Button */}
        {pastSong ? (
          <button
            onClick={playPast}
            className="interactive-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px 20px',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              cursor: 'pointer',
              width: '280px',
              textAlign: 'left',
              transition: 'all 0.2s ease',
              color: 'white',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'scale(1.03)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <ArrowLeft size={20} style={{ color: 'var(--primary)', flexShrink: 0 }} />
            {pastSong.thumbnail_url ? (
              <img 
                src={`${API_BASE}${pastSong.thumbnail_url}`} 
                alt="" 
                style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} 
              />
            ) : (
              <div style={{ width: '56px', height: '56px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Music size={20} style={{ color: 'var(--text-muted)' }} />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Past Song</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pastSong.title}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pastSong.artist}</span>
            </div>
          </button>
        ) : (
          <div style={{ width: '280px' }} />
        )}

        {/* Large Countdown Circle */}
        <div style={{
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, rgba(0,0,0,0.4) 100%)',
          border: '4px solid var(--primary)',
          boxShadow: '0 0 40px var(--primary-glow)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          animation: 'pulse-glow 2s infinite ease-in-out',
          flexShrink: 0
        }}>
          <span style={{ fontSize: '4.5rem', fontWeight: 900, lineHeight: 1 }}>{transitionCountdown}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Seconds</span>
        </div>

        {/* Next of Next Song Button */}
        {nextOfNextSong ? (
          <button
            onClick={playNextOfNext}
            className="interactive-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px 20px',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              cursor: 'pointer',
              width: '280px',
              textAlign: 'left',
              transition: 'all 0.2s ease',
              color: 'white',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'scale(1.03)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Next of Next</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nextOfNextSong.title}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nextOfNextSong.artist}</span>
            </div>
            {nextOfNextSong.thumbnail_url ? (
              <img 
                src={`${API_BASE}${nextOfNextSong.thumbnail_url}`} 
                alt="" 
                style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} 
              />
            ) : (
              <div style={{ width: '56px', height: '56px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Music size={20} style={{ color: 'var(--text-muted)' }} />
              </div>
            )}
            <ArrowRight size={20} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          </button>
        ) : (
          <div style={{ width: '280px' }} />
        )}
      </div>

      <div style={{ display: 'flex', gap: '16px', zIndex: 1 }}>
        <button
          onClick={playNextInQueue}
          className="interactive-btn"
          style={{ padding: '14px 28px', fontSize: '1rem', borderRadius: '12px' }}
        >
          Skip Countdown
        </button>
        <button
          onClick={cancelCountdown}
          className="interactive-btn secondary-btn"
          style={{ padding: '14px 28px', fontSize: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          Cancel Queue
        </button>
      </div>
    </div>
  );
}

