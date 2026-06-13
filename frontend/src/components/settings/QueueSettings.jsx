import { Music } from 'lucide-react';
import { useApp } from '../../context/app-context';

export default function QueueSettings() {
  const { queue } = useApp();

  return (
    <>
      <div>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(to right, #ffffff, #a7f3d0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Queue Settings</h2>
        <p style={{ margin: '0', color: 'var(--text-secondary)' }}>Configure user experience and queue transitions.</p>
      </div>

      <div className="glass-panel" style={{ padding: '24px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', maxWidth: '650px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Music size={18} color="var(--secondary)" /> Karaoke Queue Settings
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Configure the countdown transition duration (in seconds) between songs when playing from the queue.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <input
            type="range"
            min="0"
            max="60"
            value={queue.transitionTimerDuration}
            onChange={(e) => queue.updateTransitionTimerDuration(Number(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--secondary)' }}
          />
          <span style={{ fontSize: '1rem', fontWeight: 700, minWidth: '40px', textAlign: 'right' }}>
            {queue.transitionTimerDuration}s
          </span>
        </div>
      </div>
    </>
  );
}
