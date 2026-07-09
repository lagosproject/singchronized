import { useMemo, useRef, useState } from 'react';
import { Loader, Upload } from 'lucide-react';
import { api } from '../../api/client';
import { useApp } from '../../context/app-context';
import StatusBanner from '../common/StatusBanner';
import ArtistChipInput from './ArtistChipInput';
import { t } from '../../i18n';

export default function UploadForm() {
  const { library } = useApp();

  const [title, setTitle] = useState('');
  const [artistChips, setArtistChips] = useState([]);
  const [artistInput, setArtistInput] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const fileInputRef = useRef(null);

  // Derive existing unique artists from songs list
  const existingArtists = useMemo(() => {
    const artistsSet = new Set();
    library.songs.forEach(song => {
      if (song.artist) {
        song.artist.split(',').forEach(a => {
          const trimmed = a.trim();
          if (trimmed) artistsSet.add(trimmed);
        });
      }
    });
    return Array.from(artistsSet);
  }, [library.songs]);

  const handleUpload = async (e) => {
    e.preventDefault();

    // Include any pending free text as artists before submitting
    let allArtists = artistChips;
    if (artistInput.trim()) {
      const parts = artistInput.trim().split(',').map(p => p.trim()).filter(Boolean);
      const uniqueNewParts = parts.filter(p => !artistChips.includes(p));
      allArtists = [...artistChips, ...uniqueNewParts];
      setArtistChips(allArtists);
      setArtistInput('');
    }
    const finalArtist = allArtists.join(', ');

    if (!uploadFile || !title || !finalArtist) {
      alert(t("fillAllFields"));
      return;
    }

    setUploading(true);
    setUploadStatus({ type: 'info', message: t("uploadingAudio") });

    const formData = new FormData();
    formData.append('title', title);
    formData.append('artist', finalArtist);
    formData.append('file', uploadFile);
    try {
      await api.uploadSong(formData);
      setUploadStatus({ type: 'success', message: t("uploadCompleted") });
      setTitle('');
      setArtistChips([]);
      setArtistInput('');
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      library.fetchSongs();
    } catch {
      setUploadStatus({ type: 'error', message: t("uploadFailed") });
    } finally {
      setUploading(false);
    }
  };

  const canSubmit = title.trim() && (artistChips.length > 0 || artistInput.trim()) && uploadFile;

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Upload size={18} color="var(--primary)" /> {t("ingestNewTrack")}
      </h3>
      <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>{t("songTitle")}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder={t("songTitlePlaceholder")}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white' }}
            />
          </div>

          <ArtistChipInput
            chips={artistChips}
            setChips={setArtistChips}
            input={artistInput}
            setInput={setArtistInput}
            existingArtists={existingArtists}
          />

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>{t("audioTrackFile")}</label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => setUploadFile(e.target.files[0])}
              required
              accept="audio/*"
              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white' }}
            />
          </div>
        </div>

        <StatusBanner status={uploadStatus} />

        <button
          type="submit"
          disabled={uploading}
          className={`interactive-btn ${canSubmit ? '' : 'secondary-btn'}`}
          style={{ marginTop: '10px' }}
        >
          {uploading ? (
            <>
              <Loader size={18} className="badge-processing" style={{ marginRight: '8px' }} />
              {t("importing")}
            </>
          ) : (
            <>
              <Upload size={18} />
              {t("importIntoLibrary")}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
