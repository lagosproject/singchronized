import { useEffect, useState } from 'react';
import { Headphones, Volume2, Play, Square, Activity } from 'lucide-react';
import { useApp } from '../../context/app-context';
import { t } from '../../i18n';

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
          <Volume2 size={12} /> {t("testTone")}
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
  const { devices, playback, library } = useApp();
  const { singerVolume, setSingerVolume, audienceVolume, setAudienceVolume, updateVolume, vocalsDelay, updateDelay } = playback;
  const { singerDevice, audienceDevice, isCalibrating, startCalibration, stopCalibration } = devices;
  const hasMultipleOutputs = devices.devices.length > 1;

  const [calibrationMode, setCalibrationMode] = useState('tone');
  const [selectedSongId, setSelectedSongId] = useState('');

  const readySongs = library?.songs?.filter(s => s.status === 'synced' || s.status === 'ready') || [];
  const isSongPlaying = playback.playingSong !== null && playback.playback.is_playing;
  // Default to the first ready song until the user picks one explicitly.
  const effectiveSongId = selectedSongId || (readySongs.length > 0 ? readySongs[0].id.toString() : '');

  const toggleSongCalibration = () => {
    if (isSongPlaying) {
      playback.stop();
    } else if (effectiveSongId) {
      playback.play(Number(effectiveSongId));
    }
  };

  // Clean up calibration on unmount
  useEffect(() => {
    return () => {
      stopCalibration();
      playback.stop();
    };
  }, []);

  return (
    <>
      <div>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(to right, #ffffff, #a7f3d0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t("audioRoutingLevels")}</h2>
        <p style={{ margin: '0', color: 'var(--text-secondary)' }}>{t("audioRoutingLevelsDesc")}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '650px' }}>
        {!hasMultipleOutputs && (
          <div className="glass-panel" style={{ padding: '14px 18px', borderRadius: '12px', background: 'rgba(251, 191, 36, 0.06)', border: '1px solid rgba(251, 191, 36, 0.35)', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span>{t("onlyOneOutputNotice")}</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', paddingTop: '10px', borderTop: '1px solid rgba(251, 191, 36, 0.2)' }}>
              <input
                type="checkbox"
                checked={devices.stereoSplit}
                onChange={(e) => devices.setStereoSplit(e.target.checked)}
              />
              <span style={{ fontWeight: 600 }}>{t("stereoSplitToggle")}</span>
            </label>
            <span style={{ fontSize: '0.78rem' }}>{t("stereoSplitToggleDesc")}</span>
          </div>
        )}

        {hasMultipleOutputs && (
          <DeviceRoutingPanel
            icon={<Headphones size={18} color="var(--secondary)" />}
            label={t("singerOutput")}
            volumeLabel={t("singerMonitoringVolume")}
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
          label={t("audienceOutput")}
          volumeLabel={t("audienceMasterVolume")}
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

        {hasMultipleOutputs && (
          <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t("deviceSynchronization")}</span>
            </div>

            {/* Mode selection buttons */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
              <button
                onClick={() => {
                  if (isSongPlaying) playback.stop();
                  if (isCalibrating) stopCalibration();
                  setCalibrationMode('tone');
                }}
                className={`interactive-btn ${calibrationMode === 'tone' ? '' : 'secondary-btn'}`}
                style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}
              >
                {t("useCalibrationTone")}
              </button>
              <button
                onClick={() => {
                  if (isSongPlaying) playback.stop();
                  if (isCalibrating) stopCalibration();
                  setCalibrationMode('song');
                }}
                className={`interactive-btn ${calibrationMode === 'song' ? '' : 'secondary-btn'}`}
                style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}
              >
                {t("useLibrarySong")}
              </button>
            </div>

            {calibrationMode === 'tone' ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={18} color="var(--secondary)" />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t("calibrationToneBeats")}</span>
                </div>
                <button
                  onClick={() => isCalibrating ? stopCalibration() : startCalibration(singerDevice, audienceDevice)}
                  className="interactive-btn"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: isCalibrating ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    border: isCalibrating ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-color)',
                    color: isCalibrating ? '#f87171' : 'white',
                    cursor: 'pointer'
                  }}
                >
                  {isCalibrating ? <Square size={12} /> : <Play size={12} />}
                  {isCalibrating ? t("stopCalibrationTone") : t("startCalibrationTone")}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t("calibrateUsingSong")}</span>
                  <button
                    onClick={toggleSongCalibration}
                    disabled={readySongs.length === 0}
                    className="interactive-btn"
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: isSongPlaying ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      border: isSongPlaying ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-color)',
                      color: isSongPlaying ? '#f87171' : 'white',
                      cursor: 'pointer'
                    }}
                  >
                    {isSongPlaying ? <Square size={12} /> : <Play size={12} />}
                    {isSongPlaying ? t("stopSongPlayback") : t("startSongPlayback")}
                  </button>
                </div>
                
                {readySongs.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t("selectSongForCalibration")}</label>
                    <select
                      value={effectiveSongId}
                      onChange={(e) => {
                        if (isSongPlaying) playback.stop();
                        setSelectedSongId(e.target.value);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        color: 'white',
                        fontSize: '0.85rem',
                        outline: 'none'
                      }}
                    >
                      {readySongs.map(s => (
                        <option key={s.id} value={s.id}>{s.title} - {s.artist}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.8rem', color: '#f87171', background: 'rgba(239, 68, 68, 0.05)', border: '1px dashed rgba(239, 68, 68, 0.2)', padding: '10px 12px', borderRadius: '6px' }}>
                    {t("noSplitSongsForCalibration")}
                  </div>
                )}
              </div>
            )}

            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              {t("calibrationInstructions")}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span>{t("relativeDelay")}</span>
                <span style={{ fontWeight: 700, color: vocalsDelay === 0 ? 'var(--text-secondary)' : 'var(--secondary)' }}>
                  {vocalsDelay === 0 ? t("synchronized") : vocalsDelay > 0 ? t("vocalsLag", { ms: vocalsDelay }) : t("vocalsLead", { ms: Math.abs(vocalsDelay) })}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="range"
                  min="-500"
                  max="500"
                  step="5"
                  value={vocalsDelay}
                  onChange={(e) => updateDelay(parseInt(e.target.value, 10))}
                  style={{ flex: 1, accentColor: 'var(--secondary)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                <button
                  onClick={() => updateDelay(Math.max(-500, vocalsDelay - 50))}
                  className="interactive-btn secondary-btn"
                  style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem' }}
                >
                  -50 ms
                </button>
                <button
                  onClick={() => updateDelay(Math.max(-500, vocalsDelay - 10))}
                  className="interactive-btn secondary-btn"
                  style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem' }}
                >
                  -10 ms
                </button>
                <button
                  onClick={() => updateDelay(0)}
                  className="interactive-btn secondary-btn"
                  style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}
                >
                  {t("reset")}
                </button>
                <button
                  onClick={() => updateDelay(Math.min(500, vocalsDelay + 10))}
                  className="interactive-btn secondary-btn"
                  style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem' }}
                >
                  +10 ms
                </button>
                <button
                  onClick={() => updateDelay(Math.min(500, vocalsDelay + 50))}
                  className="interactive-btn secondary-btn"
                  style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem' }}
                >
                  +50 ms
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
