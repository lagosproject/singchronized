import { AlertTriangle, Cpu } from 'lucide-react';
import { useApp } from '../../context/app-context';
import { WHISPER_MODEL_SPECS, WHISPER_MODEL_SIZES } from '../../constants';

export default function AISettings() {
  const { devices, modelSize, setModelSize } = useApp();
  const { gpuStatus } = devices;

  return (
    <>
      <div>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(to right, #ffffff, #a7f3d0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Whisper AI & Hardware</h2>
        <p style={{ margin: '0', color: 'var(--text-secondary)' }}>Manage automatic transcription models and GPU acceleration.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '650px' }}>
        {/* Whisper transcription model */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={18} color="var(--primary)" /> Whisper Transcription Model
          </h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Select size of the Whisper speech-to-text model. Larger models are more accurate but take longer and require more VRAM/RAM.
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
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>Speed</span>
              <strong style={{ color: modelSize === 'tiny' || modelSize === 'base' ? 'var(--success)' : modelSize === 'small' ? 'var(--warning)' : 'var(--accent)' }}>
                {WHISPER_MODEL_SPECS[modelSize].speed}
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>Accuracy</span>
              <strong style={{ color: modelSize === 'medium' || modelSize === 'small' ? 'var(--success)' : 'var(--warning)' }}>
                {WHISPER_MODEL_SPECS[modelSize].accuracy}
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>VRAM/RAM Required</span>
              <strong style={{ color: 'white' }}>{WHISPER_MODEL_SPECS[modelSize].vram}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>Model Size (Parameters)</span>
              <strong style={{ color: 'white' }}>{WHISPER_MODEL_SPECS[modelSize].parameters}</strong>
            </div>
          </div>
        </div>

        <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '16px', borderRadius: '12px', display: 'flex', gap: '12px' }}>
          <AlertTriangle color="var(--warning)" style={{ flexShrink: 0 }} />
          <div>
            <h5 style={{ margin: '0 0 4px 0', color: 'var(--warning)', fontWeight: 700 }}>AI Performance Notice</h5>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Demucs and faster-whisper will automatically download model parameters from the internet on their first execution. Ensure a stable network connection when first running AI tasks.
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
              {gpuStatus.has_gpu ? `GPU Acceleration Enabled` : 'CPU Mode Enabled'}
            </h4>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {gpuStatus.has_gpu
                ? `Hardware: ${gpuStatus.gpu_name || 'Generic GPU'}. Demucs vocal split and Whisper transcribing will run up to 10x faster using GPU acceleration.`
                : `No CUDA-capable GPU detected. Demucs and Whisper will run using CPU processing (this will take longer, please select smaller Whisper sizes for faster transcription).`}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
