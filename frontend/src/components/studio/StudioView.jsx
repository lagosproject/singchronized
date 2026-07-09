import { Cpu, Layers, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/app-context';
import UploadForm from './UploadForm';
import PipelineCard from './PipelineCard';
import { t } from '../../i18n';

export default function StudioView() {
  const { library, modelSize } = useApp();
  const { songs } = library;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>{t("ingestionProcessing")}</h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>{t("ingestionProcessingDesc")}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={library.splitAll} className="interactive-btn secondary-btn"><Layers size={14} /> {t("splitAllPending")}</button>
          <button onClick={() => library.generateLyricsAll(modelSize)} className="interactive-btn secondary-btn"><Cpu size={14} /> {t("syncAllLyrics")}</button>
          <button onClick={library.fetchSongs} className="interactive-btn secondary-btn"><RefreshCw size={14} /> {t("refresh")}</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <UploadForm />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={18} color="var(--secondary)" /> {t("songPipelineQueue")}
          </h3>

          {songs.length === 0 ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              {t("noTracksPipeline")}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '550px', overflowY: 'auto', paddingRight: '4px' }}>
              {songs.map(song => (
                <PipelineCard key={song.id} song={song} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
