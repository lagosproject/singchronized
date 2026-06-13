import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useApp } from '../../context/app-context';
import StatusBanner from '../common/StatusBanner';

function LyricsEditor({ song }) {
  const { setEditingSong, library, playback } = useApp();
  const [lyricsText, setLyricsText] = useState("");
  const [saveStatus, setSaveStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.getLyrics(song.id)
      .then(data => {
        if (!cancelled) setLyricsText(data.raw || "");
      })
      .catch(err => {
        console.error("Failed to load raw lyrics:", err);
        if (!cancelled) setSaveStatus({ type: 'error', message: 'Failed to load lyrics from server.' });
      });
    return () => {
      cancelled = true;
    };
  }, [song.id]);

  const handleSave = async () => {
    setSaveStatus({ type: 'info', message: 'Saving lyrics...' });
    try {
      await api.saveLyrics(song.id, lyricsText);
      setSaveStatus({ type: 'success', message: 'Lyrics saved successfully!' });
      library.fetchSongs();
      if (playback.playback.song_id === song.id) {
        playback.fetchLyrics(song.id);
      }
      setTimeout(() => setEditingSong(null), 1000);
    } catch (err) {
      console.error(err);
      setSaveStatus({ type: 'error', message: 'Failed to save lyrics.' });
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(3, 7, 18, 0.8)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      zIndex: 1100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '800px',
        background: 'var(--bg-card)',
        border: '1px solid var(--primary)',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
      }}>
        {/* Modal Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Lyrics Editor</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{song.title} — {song.artist}</span>
          </div>
          <button
            onClick={() => setEditingSong(null)}
            className="interactive-btn secondary-btn"
            style={{ padding: '8px 12px', borderRadius: '8px' }}
          >
            Cancel
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto' }}>
          <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid var(--primary-glow)', padding: '12px 16px', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span style={{ fontWeight: 700, color: 'white' }}>LRC Format Guide:</span> Sync each line using <strong>[Minutes:Seconds.Fraction] Lyric Text</strong> format (e.g. <code>[01:23.45] Hello World</code>). Correct spelling mistakes or adjust timestamps as needed.
          </div>

          <textarea
            value={lyricsText}
            onChange={(e) => setLyricsText(e.target.value)}
            placeholder="[00:05.00] Intro instrumental...&#13;[00:15.30] First line of the song..."
            style={{
              flex: 1,
              minHeight: '350px',
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '16px',
              color: 'white',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              lineHeight: '1.6',
              resize: 'vertical',
              outline: 'none'
            }}
          />

          <StatusBanner status={saveStatus} />
        </div>

        {/* Modal Footer */}
        <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={() => setEditingSong(null)}
            className="interactive-btn secondary-btn"
          >
            Discard
          </button>
          <button
            onClick={handleSave}
            className="interactive-btn"
            disabled={saveStatus && saveStatus.type === 'info'}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LyricsEditorModal() {
  const { editingSong } = useApp();

  if (!editingSong) return null;
  // Keyed by song so the editor state resets when a different song is opened
  return <LyricsEditor key={editingSong.id} song={editingSong} />;
}
