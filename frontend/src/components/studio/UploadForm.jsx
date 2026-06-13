import { useMemo, useRef, useState } from 'react';
import { Loader, Upload } from 'lucide-react';
import { api } from '../../api/client';
import { useApp } from '../../context/app-context';
import StatusBanner from '../common/StatusBanner';
import ArtistChipInput from './ArtistChipInput';

export default function UploadForm() {
  const { library } = useApp();

  const [title, setTitle] = useState('');
  const [artistChips, setArtistChips] = useState([]);
  const [artistInput, setArtistInput] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const fileInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);

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
      alert("Please fill in all fields and select a file");
      return;
    }

    setUploading(true);
    setUploadStatus({ type: 'info', message: 'Uploading audio file...' });

    const formData = new FormData();
    formData.append('title', title);
    formData.append('artist', finalArtist);
    formData.append('file', uploadFile);
    if (thumbnailFile) {
      formData.append('thumbnail', thumbnailFile);
    }

    try {
      await api.uploadSong(formData);
      setUploadStatus({ type: 'success', message: 'Upload completed! Song added to library.' });
      setTitle('');
      setArtistChips([]);
      setArtistInput('');
      setUploadFile(null);
      setThumbnailFile(null);
      setThumbnailPreview('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
      library.fetchSongs();
    } catch {
      setUploadStatus({ type: 'error', message: 'Upload failed. Check server logs.' });
    } finally {
      setUploading(false);
    }
  };

  const canSubmit = title.trim() && (artistChips.length > 0 || artistInput.trim()) && uploadFile;

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Upload size={18} color="var(--primary)" /> Ingest New Track
      </h3>
      <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          {/* Left column: input fields */}
          <div style={{ flex: '2 1 350px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Song Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. God's Plan"
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
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Audio Track File</label>
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

          {/* Right column: thumbnail and preview */}
          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Song Cover Thumbnail (Optional)</label>
            <div
              onClick={() => thumbnailInputRef.current?.click()}
              style={{
                width: '100%',
                aspectRatio: '1',
                borderRadius: '8px',
                border: '2px dashed var(--border-color)',
                background: 'var(--bg-main)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
                position: 'relative',
                transition: 'all 0.2s ease',
                gap: '8px',
                padding: '12px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              {thumbnailPreview ? (
                <img src={thumbnailPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
              ) : (
                <>
                  <Upload size={24} style={{ color: 'var(--text-secondary)' }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Upload Image</span>
                </>
              )}
            </div>
            <input
              type="file"
              ref={thumbnailInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  setThumbnailFile(file);
                  setThumbnailPreview(URL.createObjectURL(file));
                }
              }}
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
              Importing...
            </>
          ) : (
            <>
              <Upload size={18} />
              Import into Library
            </>
          )}
        </button>
      </form>
    </div>
  );
}
