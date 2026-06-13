import { useState } from 'react';
import { Music, RefreshCw, Search, Sparkles, X, Home, User } from 'lucide-react';
import { useApp } from '../../context/app-context';
import SongRow from '../songs/SongRow';
import SongCard from '../songs/SongCard';
import PlaylistCard from '../playlists/PlaylistCard';
import PlaylistDetail from '../playlists/PlaylistDetail';
import SearchResults from './SearchResults';
import ArtistCard from '../artists/ArtistCard';
import ArtistDetail from '../artists/ArtistDetail';
import ArtistRowImage from '../artists/ArtistRowImage';
import { API_BASE } from '../../config';

const normalizeText = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

export default function HomeView({ setActiveTab }) {
  const { library, playlists, lastPlayed, openCreatePlaylistModal, playSong } = useApp();
  const { songs } = library;

  const [searchInputValue, setSearchInputValue] = useState('');
  const [executedSearchQuery, setExecutedSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState(null);

  const clearSearch = () => {
    setSearchInputValue('');
    setExecutedSearchQuery('');
  };

  const query = normalizeText(searchInputValue.trim());
  
  // Get matching songs, artists, playlists for autocomplete
  const matchingSongs = query
    ? songs.filter(s => 
        normalizeText(s.title).includes(query) || 
        normalizeText(s.artist).includes(query)
      ).slice(0, 5)
    : [];

  const uniqueArtists = Array.from(
    new Set(
      songs
        .filter(s => s.artist)
        .flatMap(s => s.artist.split(',').map(a => a.trim()).filter(Boolean))
    )
  );
  const matchingArtists = query
    ? uniqueArtists.filter(artist => 
        normalizeText(artist).includes(query)
      ).slice(0, 3)
    : [];

  const matchingPlaylists = query
    ? playlists.playlists.filter(p => 
        normalizeText(p.name).includes(query)
      ).slice(0, 3)
    : [];

  const isAtHome = !executedSearchQuery.trim() && !playlists.selectedPlaylist && !selectedArtist;
  const readySongs = songs.filter(s => s.split_status === 'COMPLETED' && s.lyrics_status === 'COMPLETED');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header & Center Search Bar (Sticky) */}
      <div style={{
        position: 'sticky',
        top: '-20px',
        zIndex: 10,
        background: 'transparent',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        maskImage: 'linear-gradient(to bottom, black 50%, rgba(0, 0, 0, 0.9) 75%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 50%, rgba(0, 0, 0, 0.9) 75%, transparent 100%)',
        padding: '20px 20px 32px 20px',
        margin: '-20px -20px 0 -20px',
        width: 'calc(100% + 40px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px'
      }}>


        {/* Top-Center Search Input */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%', maxWidth: '500px', margin: '0 auto' }}>
          <button
            onClick={() => {
              clearSearch();
              playlists.setSelectedPlaylist(null);
              setSelectedArtist(null);
            }}
            title="Home"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: isAtHome ? '1px solid var(--primary)' : '1px solid var(--border-color)',
              background: isAtHome ? 'var(--primary-glow)' : 'rgba(255, 255, 255, 0.05)',
              color: isAtHome ? 'var(--primary)' : 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.color = 'var(--primary)';
              e.currentTarget.style.boxShadow = '0 0 8px var(--primary-glow)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = isAtHome ? 'var(--primary)' : 'var(--border-color)';
              e.currentTarget.style.color = isAtHome ? 'var(--primary)' : 'var(--text-primary)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Home size={18} fill={isAtHome ? "currentColor" : "none"} />
          </button>
          <div className="search-container" style={{ flex: 1, position: 'relative' }}>
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search songs, artists, or playlists..."
              value={searchInputValue}
              onChange={(e) => setSearchInputValue(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setExecutedSearchQuery(searchInputValue);
                  setIsFocused(false);
                }
              }}
              className="search-input"
              style={{ paddingRight: searchInputValue ? '28px' : '0px' }}
            />
            {searchInputValue && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearSearch();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: '8px'
                }}
              >
                <X size={16} />
              </button>
            )}
            {/* Autocomplete Dropdown */}
            {isFocused && searchInputValue.trim() !== '' && (
              <div className="search-autocomplete-dropdown">
                {matchingSongs.length === 0 && matchingArtists.length === 0 && matchingPlaylists.length === 0 ? (
                  <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                    No quick results. Press <kbd className="kbd-key">Enter</kbd> for full search.
                  </div>
                ) : (
                  <>
                    <div style={{
                      padding: '8px 16px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      Press <kbd className="kbd-key">Enter</kbd> to search.
                    </div>
                    {/* Songs Section */}
                    {matchingSongs.length > 0 && (
                      <div className="autocomplete-section">
                        <div className="autocomplete-section-title">Songs</div>
                        {matchingSongs.map(song => (
                          <div 
                            key={song.id} 
                            className="autocomplete-item"
                            onClick={() => {
                              playSong(song.id);
                              clearSearch();
                            }}
                          >
                            <div style={{
                              width: '20px',
                              height: '20px',
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
                                <Music size={12} />
                              )}
                            </div>
                            <div className="autocomplete-item-info">
                              <span className="autocomplete-item-name">{song.title}</span>
                              <span className="autocomplete-item-desc">{song.artist}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Artists Section */}
                    {matchingArtists.length > 0 && (
                      <div className="autocomplete-section">
                        <div className="autocomplete-section-title">Artists</div>
                        {matchingArtists.map(artist => (
                          <div 
                            key={artist} 
                            className="autocomplete-item"
                            onClick={() => {
                              setSelectedArtist(artist);
                              playlists.setSelectedPlaylist(null);
                              clearSearch();
                              setIsFocused(false);
                            }}
                          >
                            <ArtistRowImage artistName={artist} size={20} />
                            <span className="autocomplete-item-name">{artist}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Playlists Section */}
                    {matchingPlaylists.length > 0 && (
                      <div className="autocomplete-section">
                        <div className="autocomplete-section-title">Playlists</div>
                        {matchingPlaylists.map(playlist => (
                          <div 
                            key={playlist.name} 
                            className="autocomplete-item"
                            onClick={() => {
                              playlists.setSelectedPlaylist(playlist);
                              setSelectedArtist(null);
                              clearSearch();
                            }}
                          >
                            <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', color: 'var(--primary)' }}>
                              P
                            </div>
                            <span className="autocomplete-item-name">{playlist.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {executedSearchQuery.trim() ? (
        <SearchResults
          query={executedSearchQuery}
          onClear={clearSearch}
          onSelectArtist={(artist) => {
            setSelectedArtist(artist);
            playlists.setSelectedPlaylist(null);
            clearSearch();
          }}
          onSelectPlaylist={(playlist) => {
            playlists.setSelectedPlaylist(playlist);
            setSelectedArtist(null);
            clearSearch();
          }}
        />
      ) : playlists.selectedPlaylist ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <PlaylistDetail playlist={playlists.selectedPlaylist} />
        </div>
      ) : selectedArtist ? (
        <ArtistDetail artistName={selectedArtist} onClose={() => setSelectedArtist(null)} />
      ) : (
        <>
          {/* Your Playlists */}
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '16px' }}>
              Your Playlists
            </h3>
            <div className="spotify-grid">
              {/* Create Playlist Card Button */}
              <div
                className="spotify-card"
                onClick={() => openCreatePlaylistModal()}
                style={{
                  border: '2px dashed var(--primary-glow)',
                  background: 'rgba(139,92,246,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  minHeight: '210px'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', justifyContent: 'center', margin: 'auto' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '24px', fontWeight: 300, color: 'var(--primary)' }}>+</span>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Create Playlist</h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Custom Playlist</p>
                  </div>
                </div>
              </div>

              {playlists.playlists.map(p => (
                <PlaylistCard key={p.name} playlist={p} onClick={() => {
                  playlists.setSelectedPlaylist(p);
                  setSelectedArtist(null);
                }} />
              ))}
            </div>
          </div>

          {/* Last Played */}
          {lastPlayed.length > 0 && (
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCw size={18} color="var(--primary)" /> Last Played
              </h3>
              <div className="spotify-grid">
                {lastPlayed.map(id => {
                  const song = songs.find(s => s.id === id);
                  if (!song) return null;
                  return <SongCard key={song.id} song={song} />;
                })}
              </div>
            </div>
          )}

          {/* Recommended Songs */}
          {readySongs.length > 0 && (
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="var(--secondary)" /> Recommended for Karaoke
              </h3>
              <div className="spotify-grid">
                {readySongs.slice(0, 4).map(song => (
                  <SongCard key={song.id} song={song} accent />
                ))}
              </div>
            </div>
          )}

          {/* Artists */}
          {uniqueArtists.length > 0 && (
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={18} color="var(--primary)" /> Artists
              </h3>
              <div className="spotify-grid">
                {uniqueArtists.map(artistName => {
                  const count = songs.filter(s => s.artist && s.artist.split(',').map(a => a.trim()).includes(artistName)).length;
                  return (
                    <ArtistCard
                      key={artistName}
                      artistName={artistName}
                      songsCount={count}
                      onClick={() => {
                        setSelectedArtist(artistName);
                        playlists.setSelectedPlaylist(null);
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* All Tracks Row List */}
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '16px' }}>All Songs</h3>

            {songs.length === 0 ? (
              <div className="glass-panel" style={{ padding: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', color: 'var(--text-secondary)' }}>
                <Music size={48} color="var(--text-muted)" />
                <div style={{ textAlign: 'center' }}>
                  <h3>Your library is empty</h3>
                  <p>Go to the <strong>Ingestion & Processing</strong> tab to import some tracks and prepare them with local AI!</p>
                </div>
                <button onClick={() => setActiveTab('studio')} className="interactive-btn">Go to Ingestion & Processing</button>
              </div>
            ) : (
              <div className="glass-panel" style={{ padding: '8px' }}>
                {songs.map((song, index) => (
                  <SongRow
                    key={song.id}
                    song={song}
                    index={index}
                    dropdownId={`inline_all_${song.id}_${index}`}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
