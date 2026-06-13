import { useState, useEffect, useRef } from 'react';
import { Minimize2, Pause, PlayCircle, Sparkles, SkipForward } from 'lucide-react';
import { useApp } from '../../context/app-context';
import SeekBar from './SeekBar';

export default function FullscreenLyrics() {
  const { playback, queue } = useApp();
  const { playback: status, playingSong, lyrics, activeLyricIndex, isFullscreenLyrics, setIsFullscreenLyrics, pause, resume } = playback;


  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!isFullscreenLyrics) return;

    const showControls = () => {
      setIsControlsVisible(true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setIsControlsVisible(false);
      }, 3000); // Hide after 3 seconds of inactivity
    };

    // Initialize timer
    showControls();

    window.addEventListener('mousemove', showControls);
    window.addEventListener('keydown', showControls);
    window.addEventListener('mousedown', showControls);

    return () => {
      window.removeEventListener('mousemove', showControls);
      window.removeEventListener('keydown', showControls);
      window.removeEventListener('mousedown', showControls);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isFullscreenLyrics]);

  if (!status.is_playing || !playingSong || !isFullscreenLyrics) return null;

  return (
    <div 
      className="fullscreen-overlay"
      style={{ cursor: isControlsVisible ? 'default' : 'none' }}
    >
      {/* Top Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        opacity: isControlsVisible ? 1 : 0,
        pointerEvents: isControlsVisible ? 'auto' : 'none',
        transition: 'opacity 0.5s ease-in-out'
      }}>
        <div>
          <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Karaoke Mode</span>
          <h2 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 800 }}>{playingSong.title}</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '1.25rem', color: 'var(--text-secondary)' }}>{playingSong.artist}</p>
        </div>

        <button
          onClick={() => setIsFullscreenLyrics(false)}
          className="interactive-btn secondary-btn"
          style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)' }}
        >
          <Minimize2 size={18} /> Close Fullscreen (Esc)
        </button>
      </div>

      {/* Central Synced Lyrics View */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'center', margin: 'auto 0' }}>
        {lyrics.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <Sparkles size={36} className="badge-processing" />
            <p style={{ fontSize: '1.5rem' }}>No synced lyrics available. Turn on AI lyrics for this song!</p>
          </div>
        ) : (
          <>
            {/* Previous Line */}
            <p style={{ fontSize: '1.8rem', color: 'var(--text-muted)', margin: 0, opacity: 0.4, transition: 'all 0.3s ease' }}>
              {activeLyricIndex > 0 ? lyrics[activeLyricIndex - 1].text : ''}
            </p>

            {/* Current Active Line */}
            <p style={{
              fontSize: '4.5rem',
              fontWeight: 900,
              color: 'white',
              margin: '12px 0',
              lineHeight: '1.25',
              background: 'linear-gradient(to right, #00f2fe 0%, #4facfe 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 30px rgba(6, 182, 212, 0.4)',
              animation: 'pulse-glow 2s infinite ease-in-out'
            }}>
              {activeLyricIndex >= 0 ? lyrics[activeLyricIndex].text : 'Instrumental Intro / Prepare to Sing...'}
            </p>

            {/* Next Line */}
            <p style={{ fontSize: '2.2rem', color: 'var(--text-secondary)', margin: 0, opacity: 0.75, transition: 'all 0.3s ease' }}>
              {activeLyricIndex < lyrics.length - 1 ? lyrics[activeLyricIndex + 1].text : 'Outro...'}
            </p>
          </>
        )}
      </div>

      {/* Bottom Player Controls & Seek Slider */}
      <div className="glass-panel" style={{ 
        padding: '24px', 
        borderRadius: '16px', 
        background: 'rgba(0,0,0,0.4)', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '24px',
        opacity: isControlsVisible ? 1 : 0,
        pointerEvents: isControlsVisible ? 'auto' : 'none',
        transition: 'opacity 0.5s ease-in-out'
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {status.is_paused ? (
            <button onClick={resume} className="interactive-btn" style={{ padding: '12px 20px' }}><PlayCircle size={18} /> Resume</button>
          ) : (
            <button onClick={pause} className="interactive-btn secondary-btn" style={{ padding: '12px 20px' }}><Pause size={18} /> Pause</button>
          )}
          {queue.queue.length > 0 && queue.currentQueueIndex !== null && queue.currentQueueIndex < queue.queue.length - 1 && (
            <button
              onClick={async () => {
                await playback.stop();
                queue.startCountdown();
              }}
              className="interactive-btn secondary-btn"
              style={{ padding: '12px 20px' }}
              title="Next to Timer"
            >
              <SkipForward size={18} /> Next
            </button>
          )}
        </div>

        <SeekBar large />

        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '12px' }}>
          <span>Space: Pause/Play</span>
          <span>←/→: Seek</span>
        </div>
      </div>
    </div>
  );
}
