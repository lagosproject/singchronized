import { useState } from 'react';
import { useApp } from '../../context/app-context';
import SongRow from '../songs/SongRow';
import PlaylistCard from '../playlists/PlaylistCard';
import ArtistCard from '../artists/ArtistCard';
import ArtistRowImage from '../artists/ArtistRowImage';

const FILTERS = ['all', 'songs', 'artists', 'playlists'];

const normalizeText = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const getMatchScore = (text, query) => {
  if (!text || !query) return 0;
  const t = normalizeText(text);
  const q = normalizeText(query);
  
  if (t === q) return 100; // Exact match
  if (t.startsWith(q)) return 80; // Starts with
  
  // Word boundary match
  const index = t.indexOf(q);
  if (index !== -1) {
    if (index > 0 && (t[index - 1] === ' ' || t[index - 1] === '-' || t[index - 1] === '_')) {
      return 60; // Starts at word boundary
    }
    return 40; // Contained somewhere
  }
  
  // Fuzzy character matching (subsequence match)
  let qIdx = 0;
  let matches = 0;
  for (let i = 0; i < t.length && qIdx < q.length; i++) {
    if (t[i] === q[qIdx]) {
      qIdx++;
      matches++;
    }
  }
  if (matches === q.length) {
    return 10 + (q.length / t.length) * 10;
  }
  
  return 0; // No match
};

export default function SearchResults({ query, onClear, onSelectArtist, onSelectPlaylist }) {
  const { library, playlists } = useApp();
  const [searchFilter, setSearchFilter] = useState('all');

  // Compute all potential matches with scoring
  const allSongMatches = library.songs
    .map(song => ({
      type: 'song',
      data: song,
      score: Math.max(getMatchScore(song.title, query), getMatchScore(song.artist, query))
    }))
    .filter(item => item.score > 0);

  const allArtistMatches = Array.from(
    new Set(
      library.songs
        .filter(song => song.artist)
        .flatMap(song => song.artist.split(',').map(a => a.trim()).filter(Boolean))
    )
  )
    .map(artist => ({
      type: 'artist',
      data: artist,
      score: getMatchScore(artist, query)
    }))
    .filter(item => item.score > 0);

  const allPlaylistMatches = playlists.playlists
    .map(p => ({
      type: 'playlist',
      data: p,
      score: getMatchScore(p.name, query)
    }))
    .filter(item => item.score > 0);

  // Unified sorting for the 'all' tab
  const mixedMatches = [...allSongMatches, ...allArtistMatches, ...allPlaylistMatches]
    .sort((a, b) => b.score - a.score);

  // Helper arrays for specific filters
  const songMatches = [...allSongMatches].sort((a, b) => b.score - a.score).map(item => item.data);
  const uniqueArtistMatches = [...allArtistMatches].sort((a, b) => b.score - a.score).map(item => item.data);
  const playlistMatches = [...allPlaylistMatches].sort((a, b) => b.score - a.score).map(item => item.data);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Filter pills */}
      <div className="filter-pills-container">
        {FILTERS.map((filterType) => (
          <button
            key={filterType}
            onClick={() => setSearchFilter(filterType)}
            className={`filter-pill ${searchFilter === filterType ? 'active' : ''}`}
          >
            {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
          </button>
        ))}
      </div>

      <div>
        {/* Filter: All (Mixed Results) */}
        {searchFilter === 'all' && (
          <div>
            {mixedMatches.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: '8px' }}>No matching results found.</p>
            ) : (
              <div className="glass-panel" style={{ padding: '8px' }}>
                {mixedMatches.map((item, index) => {
                  if (item.type === 'song') {
                    return (
                      <SongRow
                        key={`mixed_song_${item.data.id}_${index}`}
                        song={item.data}
                        index={index}
                        dropdownId={`mixed_song_${item.data.id}_${index}`}
                        showPendingHint={false}
                        hideIndex={true}
                      />
                    );
                  } else if (item.type === 'artist') {
                    const artistName = item.data;
                    const count = library.songs.filter(s => s.artist && s.artist.split(',').map(a => a.trim()).includes(artistName)).length;
                    return (
                      <div
                        key={`mixed_artist_${artistName}_${index}`}
                        className="spotify-row"
                        onClick={() => onSelectArtist(artistName)}
                        style={{ display: 'grid', gridTemplateColumns: '48px 1fr 100px', alignItems: 'center', position: 'relative' }}
                      >
                        <ArtistRowImage artistName={artistName} size={32} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white' }}>{artistName}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Artist</div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-secondary)', paddingRight: '8px' }}>
                          {count} {count === 1 ? 'song' : 'songs'}
                        </div>
                      </div>
                    );
                  } else if (item.type === 'playlist') {
                    const playlist = item.data;
                    return (
                      <div
                        key={`mixed_playlist_${playlist.name}_${index}`}
                        className="spotify-row"
                        onClick={() => onSelectPlaylist ? onSelectPlaylist(playlist) : playlists.setSelectedPlaylist(playlist)}
                        style={{ display: 'grid', gridTemplateColumns: '48px 1fr 100px', alignItems: 'center', position: 'relative' }}
                      >
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, var(--secondary) 0%, var(--accent) 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '0.8rem',
                          fontWeight: 'bold'
                        }}>
                          P
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white' }}>{playlist.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Playlist</div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-secondary)', paddingRight: '8px' }}>
                          {playlist.songs.length} {playlist.songs.length === 1 ? 'track' : 'tracks'}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>
        )}

        {/* Filter: Songs */}
        {searchFilter === 'songs' && (
          <div>
            {songMatches.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: '8px' }}>No matching songs found.</p>
            ) : (
              <div className="glass-panel" style={{ padding: '8px' }}>
                {songMatches.map((song, index) => (
                  <SongRow
                    key={`song_tab_${song.id}_${index}`}
                    song={song}
                    index={index}
                    dropdownId={`search_song_tab_${song.id}_${index}`}
                    showPendingHint={false}
                    hideIndex={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Filter: Artists */}
        {searchFilter === 'artists' && (
          <div>
            {uniqueArtistMatches.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: '8px' }}>No matching artists found.</p>
            ) : (
              <div className="spotify-grid">
                {uniqueArtistMatches.map((artistName) => {
                  const count = library.songs.filter(s => s.artist && s.artist.split(',').map(a => a.trim()).includes(artistName)).length;
                  return (
                    <ArtistCard
                      key={`artist_tab_${artistName}`}
                      artistName={artistName}
                      songsCount={count}
                      onClick={() => onSelectArtist(artistName)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Filter: Playlists */}
        {searchFilter === 'playlists' && (
          <div>
            {playlistMatches.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: '8px' }}>No matching playlists found.</p>
            ) : (
              <div className="spotify-grid">
                {playlistMatches.map(p => (
                  <PlaylistCard
                    key={`playlist_tab_${p.name}`}
                    playlist={p}
                    onClick={() => onSelectPlaylist ? onSelectPlaylist(p) : playlists.setSelectedPlaylist(p)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
