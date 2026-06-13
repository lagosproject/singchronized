import { Cpu, Edit, Layers, Trash2 } from 'lucide-react';
import { useApp } from '../../context/app-context';

function StatusBadge({ status, labels }) {
  if (status === 'COMPLETED') {
    return <span className="badge badge-completed" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>{labels.completed}</span>;
  }
  if (status === 'PROCESSING') {
    return <span className="badge badge-processing" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>{labels.processing}</span>;
  }
  return <span className="badge badge-pending" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>{labels.pending}</span>;
}

export default function PipelineCard({ song }) {
  const { library, modelSize, setEditingSong } = useApp();

  return (
    <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1rem' }}>{song.title}</h4>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{song.artist}</p>
        </div>
        <button
          onClick={() => library.deleteSong(song.id)}
          className="interactive-btn secondary-btn"
          style={{ padding: '8px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)', borderRadius: '6px' }}
        >
          <Trash2 size={12} />
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Split Status:</span>
          <StatusBadge status={song.split_status} labels={{ completed: 'Ready', processing: 'Processing', pending: 'Pending' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Lyrics Sync:</span>
          <StatusBadge status={song.lyrics_status} labels={{ completed: 'Synced', processing: 'Syncing', pending: 'No Lyrics' }} />
        </div>
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

        {(song.lyrics_status === 'PENDING' || song.lyrics_status === 'FAILED') && (
          <button
            onClick={() => library.generateLyrics(song.id, modelSize)}
            className="interactive-btn secondary-btn"
            style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px' }}
            disabled={song.lyrics_status === 'PROCESSING' || song.split_status !== 'COMPLETED'}
            title={song.split_status !== 'COMPLETED' ? "Split audio first to isolate clean vocals for transcription" : "Generate lyrics"}
          >
            <Cpu size={12} /> Auto Lyrics
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
