import { Maximize2, Pause, PlayCircle, SkipForward } from 'lucide-react';
import { useApp } from '../../context/app-context';
import SeekBar from './SeekBar';

export default function PlayerBar() {
  const { playback, queue } = useApp();
  const { playback: status, playingSong, isFullscreenLyrics, setIsFullscreenLyrics, pause, resume } = playback;

  if (!status.is_playing || !playingSong || isFullscreenLyrics) return null;

  return (
    <div className="bottom-player-bar">
      <div style={{ display: 'flex', flexDirection: 'column', width: '200px', flexShrink: 0 }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Singing Now</span>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={playingSong.title}>
          {playingSong.title}
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{playingSong.artist}</span>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
        {status.is_paused ? (
          <button onClick={resume} className="interactive-btn" style={{ padding: '8px 12px', borderRadius: '8px' }} title="Resume (Space)"><PlayCircle size={14} /></button>
        ) : (
          <button onClick={pause} className="interactive-btn secondary-btn" style={{ padding: '8px 12px', borderRadius: '8px' }} title="Pause (Space)"><Pause size={14} /></button>
        )}
        {queue.queue.length > 0 && queue.currentQueueIndex !== null && queue.currentQueueIndex < queue.queue.length - 1 && (
          <button
            onClick={async () => {
              await playback.stop();
              queue.startCountdown();
            }}
            className="interactive-btn secondary-btn"
            style={{ padding: '8px 12px', borderRadius: '8px' }}
            title="Next to Timer"
          >
            <SkipForward size={14} />
          </button>
        )}
      </div>


      <SeekBar />

      <button
        onClick={() => setIsFullscreenLyrics(true)}
        className="interactive-btn secondary-btn"
        style={{ padding: '8px 12px', borderRadius: '8px' }}
        title="Fullscreen Lyrics (F)"
      >
        <Maximize2 size={14} /> Fullscreen
      </button>
    </div>
  );
}
