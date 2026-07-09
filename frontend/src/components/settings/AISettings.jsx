import { AlertTriangle, Cpu } from 'lucide-react';
import { useApp } from '../../context/app-context';
import { WHISPER_MODEL_SPECS, WHISPER_MODEL_SIZES } from '../../constants';
import { t } from '../../i18n';

export default function AISettings() {
  const { devices, modelSize, setModelSize } = useApp();
  const { gpuStatus } = devices;

  return (
    <>
      <div>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(to right, #ffffff, #a7f3d0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t("whisperAIHardware")}</h2>
        <p style={{ margin: '0', color: 'var(--text-secondary)' }}>{t("manageTranscriptionDesc")}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '650px' }}>
        {/* Whisper transcription model */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={18} color="var(--primary)" /> {t("whisperTranscriptionModel")}
          </h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {t("selectWhisperSizeDesc")}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {WHISPER_MODEL_SIZES.map(size => (
              <button
                key={size}
                onClick={() => setModelSize(size)}
                className={`interactive-btn ${modelSize === size ? '' : 'secondary-btn'}`}
                style={{ textTransform: 'capitalize' }}
              >
                {size}
              </button>
            ))}
          </div>

          {/* Selected Model Details card */}
          <div style={{
            marginTop: '16px',
            padding: '16px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-color)',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
            fontSize: '0.85rem'
          }}>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>{t("speed")}</span>
              <strong style={{ color: modelSize === 'tiny' || modelSize === 'base' ? 'var(--success)' : modelSize === 'small' ? 'var(--warning)' : 'var(--accent)' }}>
                {t("whisper_" + modelSize + "_speed")}
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>{t("accuracy")}</span>
              <strong style={{ color: modelSize === 'medium' || modelSize === 'small' ? 'var(--success)' : 'var(--warning)' }}>
                {t("whisper_" + modelSize + "_accuracy")}
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>{t("vramRamRequired")}</span>
              <strong style={{ color: 'white' }}>{WHISPER_MODEL_SPECS[modelSize].vram}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>{t("modelSizeParameters")}</span>
              <strong style={{ color: 'white' }}>{WHISPER_MODEL_SPECS[modelSize].parameters}</strong>
            </div>
          </div>
        </div>

        <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '16px', borderRadius: '12px', display: 'flex', gap: '12px' }}>
          <AlertTriangle color="var(--warning)" style={{ flexShrink: 0 }} />
          <div>
            <h5 style={{ margin: '0 0 4px 0', color: 'var(--warning)', fontWeight: 700 }}>{t("aiPerformanceNotice")}</h5>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {t("aiPerformanceDesc")}
            </p>
          </div>
        </div>

        {/* GPU Status Acceleration Card */}
        <div className="glass-panel" style={{
          padding: '16px',
          borderRadius: '12px',
          background: gpuStatus.has_gpu ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
          border: `1px solid ${gpuStatus.has_gpu ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            background: gpuStatus.has_gpu ? 'var(--success)' : 'var(--warning)',
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 12px ${gpuStatus.has_gpu ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
            flexShrink: 0
          }}>
            <Cpu size={20} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 2px 0', fontSize: '0.95rem', fontWeight: 700, color: 'white' }}>
              {gpuStatus.has_gpu ? t("gpuAccelerationEnabled") : t("cpuModeEnabled")}
            </h4>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {gpuStatus.has_gpu
                ? t("gpuEnabledDesc", { gpuName: gpuStatus.gpu_name || 'Generic GPU' })
                : t("cpuEnabledDesc")}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
