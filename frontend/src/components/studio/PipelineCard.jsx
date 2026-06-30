import { Cpu, Edit, Layers, Trash2 } from 'lucide-react';
import { useApp } from '../../context/app-context';

function StatusBadge({ status, labels, progress = 0 }) {
  if (status === 'COMPLETED') {
    return <span className="badge badge-completed" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>{labels.completed}</span>;
  }
  if (status === 'PROCESSING') {
    return (
      <span 
        className="badge badge-processing" 
        style={{ 
          fontSize: '0.65rem', 
          padding: '2px 6px',
          background: `linear-gradient(to right, rgba(245, 158, 11, 0.45) ${progress}%, rgba(245, 158, 11, 0.1) ${progress}%)`,
          borderColor: 'rgba(245, 158, 11, 0.4)',
          animation: progress > 0 ? 'none' : undefined
        }}
      >
        {labels.processing}
      </span>
    );
  }
  return <span className="badge badge-pending" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>{labels.pending}</span>;
}

export default function PipelineCard({ song }) {
  const { library, modelSize, setEditingSong, playback } = useApp();
  const progressMap = playback?.progressMap || {};

  const splitProgress = progressMap[`split_${song.id}`]?.progress ?? 0;
  const lyricsProgress = progressMap[`lyrics_${song.id}`]?.progress ?? 0;

  return (
    <div className="glass-panel" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 auto', minWidth: '150px' }}>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{song.title}</h4>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{song.artist}</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Split:</span>
            <StatusBadge 
              status={song.split_status} 
              progress={splitProgress}
              labels={{ 
                completed: 'Ready', 
                processing: splitProgress > 0 ? `Processing ${splitProgress}%` : 'Processing', 
                pending: 'Pending' 
              }} 
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Lyrics:</span>
            <StatusBadge 
              status={song.lyrics_status} 
              progress={lyricsProgress}
              labels={{ 
                completed: `Synced (${song.lyrics_model || 'base'})`, 
                processing: song.lyrics_model 
                  ? (lyricsProgress > 0 ? `Syncing (${song.lyrics_model}) ${lyricsProgress}%` : `Syncing (${song.lyrics_model})`) 
                  : 'Syncing', 
                pending: 'No Lyrics' 
              }} 
            />
          </div>
        </div>

        <button
          onClick={() => library.deleteSong(song.id)}
          className="interactive-btn secondary-btn"
          style={{ padding: '8px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)', borderRadius: '6px', flexShrink: 0 }}
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Pipeline trigger actions */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {(song.split_status === 'PENDING' || song.split_status === 'FAILED') && (
          <button
            onClick={() => library.startSplit(song.id)}
            className="interactive-btn secondary-btn"
            style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px' }}
            disabled={song.split_status === 'PROCESSING'}
          >
            <Layers size={12} /> Split Audio
          </button>
        )}

        {(song.lyrics_status === 'PENDING' || song.lyrics_status === 'FAILED' || (song.lyrics_status === 'COMPLETED' && song.lyrics_model !== modelSize)) && (
          <button
            onClick={() => library.generateLyrics(song.id, modelSize)}
            className="interactive-btn secondary-btn"
            style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px' }}
            disabled={song.lyrics_status === 'PROCESSING' || song.split_status !== 'COMPLETED'}
            title={
              song.split_status !== 'COMPLETED'
                ? "Split audio first to isolate clean vocals for transcription"
                : song.lyrics_status === 'COMPLETED'
                ? `Regenerate lyrics using the current settings model (${modelSize})`
                : "Generate lyrics"
            }
          >
            <Cpu size={12} /> {song.lyrics_status === 'COMPLETED' ? 'Redo Lyrics' : 'Auto Lyrics'}
          </button>
        )}

        <button
          onClick={() => setEditingSong(song)}
          className="interactive-btn secondary-btn"
          style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px' }}
          title="Edit Lyrics"
        >
          <Edit size={12} /> Edit Lyrics
        </button>
      </div>
    </div>
  );
}
