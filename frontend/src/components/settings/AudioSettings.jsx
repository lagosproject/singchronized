import { Headphones, Volume2 } from 'lucide-react';
import { useApp } from '../../context/app-context';

function DeviceRoutingPanel({ icon, label, volumeLabel, device, onDeviceChange, volume, onVolumeChange, onTestTone, accentColor }) {
  const { devices } = useApp();

  return (
    <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {icon}
          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{label}</span>
        </div>
        <button
          onClick={onTestTone}
          className="interactive-btn secondary-btn"
          style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <Volume2 size={12} /> Test Tone
        </button>
      </div>

      <select
        value={device ?? ''}
        onChange={(e) => onDeviceChange(/^\d+$/.test(e.target.value) ? Number(e.target.value) : e.target.value)}
        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', fontSize: '0.9rem', color: 'white' }}
      >
        {devices.devices.map(d => (
          <option key={d.index} value={d.index}>{d.name}</option>
        ))}
      </select>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <span>{volumeLabel}</span>
          <span style={{ fontWeight: 700 }}>{Math.round(volume * 100)}%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Volume2 size={14} color="var(--text-muted)" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor }}
          />
        </div>
      </div>
    </div>
  );
}

export default function AudioSettings() {
  const { devices, playback } = useApp();
  const { singerVolume, setSingerVolume, audienceVolume, setAudienceVolume, updateVolume } = playback;
  const hasMultipleOutputs = devices.devices.length > 1;

  return (
    <>
      <div>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(to right, #ffffff, #a7f3d0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Audio Routing & Levels</h2>
        <p style={{ margin: '0', color: 'var(--text-secondary)' }}>Configure output audio interfaces and monitoring volume.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '650px' }}>
        {!hasMultipleOutputs && (
          <div className="glass-panel" style={{ padding: '14px 18px', borderRadius: '12px', background: 'rgba(251, 191, 36, 0.06)', border: '1px solid rgba(251, 191, 36, 0.35)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Only one audio output was found, so singer and audience audio cannot be separated.
            Connect a second output (Bluetooth or USB headphones, a USB sound card, or an HDMI screen with speakers) and the singer output will appear here automatically.
          </div>
        )}

        {hasMultipleOutputs && (
          <DeviceRoutingPanel
            icon={<Headphones size={18} color="var(--secondary)" />}
            label="Singer Output (Vocal Monitoring / Headphones)"
            volumeLabel="Singer Monitoring Volume"
            device={devices.singerDevice}
            onDeviceChange={devices.selectSingerDevice}
            volume={singerVolume}
            onVolumeChange={(v) => {
              setSingerVolume(v);
              updateVolume(v, audienceVolume);
            }}
            onTestTone={() => devices.playTestTone(devices.singerDevice)}
            accentColor="var(--secondary)"
          />
        )}

        <DeviceRoutingPanel
          icon={<Volume2 size={18} color="var(--primary)" />}
          label="Audience Output (Instrumental / Speakers)"
          volumeLabel="Audience Master Volume"
          device={devices.audienceDevice}
          onDeviceChange={devices.selectAudienceDevice}
          volume={audienceVolume}
          onVolumeChange={(v) => {
            setAudienceVolume(v);
            updateVolume(singerVolume, v);
          }}
          onTestTone={() => devices.playTestTone(devices.audienceDevice)}
          accentColor="var(--primary)"
        />
      </div>
    </>
  );
}
