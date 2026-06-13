import { useApp } from '../../context/app-context';

const formatTime = (seconds) => new Date(seconds * 1000).toISOString().substr(14, 5);

export default function SeekBar({ large = false }) {
  const { playback } = useApp();
  const { playback: status, lyrics, seek } = playback;

  const fallbackDuration = lyrics.length > 0 ? (lyrics[lyrics.length - 1].time + 10) : 300;
  const duration = status.duration || fallbackDuration;
  const displayedDuration = status.duration || (lyrics.length > 0 ? (lyrics[lyrics.length - 1].time + 10) : 0);

  const timeStyle = large
    ? { fontSize: '0.9rem', color: 'var(--text-secondary)', fontFamily: 'monospace', minWidth: '45px' }
    : { fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', minWidth: '35px' };

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: large ? '16px' : '10px' }}>
      <span style={timeStyle}>{formatTime(status.current_time)}</span>
      <input
        type="range"
        min="0"
        max={duration}
        value={status.current_time || 0}
        onChange={(e) => seek(e.target.value)}
        className="seek-slider"
        style={large ? { height: '8px' } : undefined}
      />
      <span style={timeStyle}>{formatTime(displayedDuration)}</span>
    </div>
  );
}
