import { useState } from 'react';
import { api } from '../../api/client';
import { useApp } from '../../context/app-context';
import { Music, Search, Trash2, Plus } from 'lucide-react';
import { API_BASE } from '../../config';

function CreatePlaylistForm({ presetSongIds }) {
  const { closeCreatePlaylistModal, library, playlists } = useApp();

  const [name, setName] = useState("");
  const [selectedSongIds, setSelectedSongIds] = useState(presetSongIds);
  const [coverFile, setCoverFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.createPlaylist(name, selectedSongIds);
      if (coverFile) {
        await api.uploadPlaylistThumbnail(name, coverFile);
      }
      closeCreatePlaylistModal();
      playlists.fetchPlaylists();
    } catch (err) {
      console.error(err);
      alert(err.message || "Error creating playlist");
    }
  };

  const toggleSong = (songId) => {
    setSelectedSongIds(prev =>
      prev.includes(songId) ? prev.filter(id => id !== songId) : [...prev, songId]
    );
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
        maxWidth: '500px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '85vh',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
      }}>
        {/* Modal Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Create New Playlist</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Add tracks to a new custom playlist</span>
          </div>
          <button
            onClick={closeCreatePlaylistModal}
            className="interactive-btn secondary-btn"
            style={{ padding: '8px 12px', borderRadius: '8px' }}
          >
            Cancel
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, overflowY: 'auto' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>Playlist Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. My Favorites, Workout Mix..."
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.95rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>Playlist Cover Thumbnail (Optional)</label>
              <input
                type="file"
                onChange={(e) => setCoverFile(e.target.files[0])}
                accept="image/*"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.9rem' }}
              />
            </div>

            {/* Search Tracks to Add */}
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Search Tracks to Add
              </label>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Type song title or artist..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--border-color)',
                    color: 'white',
                    fontSize: '0.95rem'
                  }}
                />
              </div>

              {/* Autocomplete Dropdown */}
              {showSearchResults && searchQuery.trim() !== "" && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 10,
                  maxHeight: '200px',
                  overflowY: 'auto',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  marginTop: '4px',
                  padding: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}>
                  {library.songs
                    .filter(song =>
                      (song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       song.artist.toLowerCase().includes(searchQuery.toLowerCase())) &&
                      !selectedSongIds.includes(song.id)
                    )
                    .map(song => (
                      <div
                        key={song.id}
                        onClick={() => {
                          setSelectedSongIds(prev => [...prev, song.id]);
                          setSearchQuery("");
                          setShowSearchResults(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          background: 'transparent',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--primary)',
                          flexShrink: 0
                        }}>
                          {song.thumbnail_url ? (
                            <img src={`${API_BASE}${song.thumbnail_url}`} alt={song.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <Music size={14} />
                          )}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.artist}</div>
                        </div>
                        <Plus size={14} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    ))}
                  {library.songs.filter(song =>
                    (song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                     song.artist.toLowerCase().includes(searchQuery.toLowerCase())) &&
                    !selectedSongIds.includes(song.id)
                  ).length === 0 && (
                    <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No matching songs found
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflow: 'hidden' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Selected Tracks ({selectedSongIds.length})
              </label>

              {selectedSongIds.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', fontSize: '0.9rem' }}>
                  No tracks selected yet. Search above to add tracks.
                </div>
              ) : (
                <div style={{
                  flex: 1,
                  minHeight: '180px',
                  overflowY: 'auto',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  {library.songs
                    .filter(song => selectedSongIds.includes(song.id))
                    .map(song => (
                      <div
                        key={song.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: 'rgba(139,92,246,0.05)',
                          border: '1px solid rgba(139,92,246,0.15)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--primary)',
                          flexShrink: 0
                        }}>
                          {song.thumbnail_url ? (
                            <img src={`${API_BASE}${song.thumbnail_url}`} alt={song.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <Music size={16} />
                          )}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.artist}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleSong(song.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'rgba(0,0,0,0.1)' }}>
            <button
              type="button"
              onClick={closeCreatePlaylistModal}
              className="interactive-btn secondary-btn"
            >
              Discard
            </button>
            <button
              type="submit"
              className="interactive-btn"
              disabled={!name.trim() || selectedSongIds.length === 0}
            >
              Create Playlist
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CreatePlaylistModal() {
  const { createPlaylistModal } = useApp();

  if (!createPlaylistModal.open) return null;
  // Mounts fresh each time the modal opens so the form state resets
  return <CreatePlaylistForm presetSongIds={createPlaylistModal.presetSongIds} />;
}
