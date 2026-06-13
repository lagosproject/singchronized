import { API_BASE } from '../config';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    let detail;
    try {
      detail = (await res.json()).detail;
    } catch {
      detail = res.statusText;
    }
    throw new Error(detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

const postJson = (path, body) => request(path, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

export const api = {
  // Songs / library
  getSongs: () => request('/api/songs'),
  uploadSong: (formData) => request('/api/songs', { method: 'POST', body: formData }),
  deleteSong: (id) => request(`/api/songs/${id}`, { method: 'DELETE' }),
  splitSong: (id) => request(`/api/songs/${id}/split`, { method: 'POST' }),
  generateLyrics: (id, modelSize) => request(`/api/songs/${id}/generate-lyrics?model_size=${modelSize}`, { method: 'POST' }),
  splitAll: () => request('/api/songs/split-all', { method: 'POST' }),
  generateLyricsAll: (modelSize) => request(`/api/songs/generate-lyrics-all?model_size=${modelSize}`, { method: 'POST' }),
  getArtistImage: (name) => request(`/api/songs/artists/image?name=${encodeURIComponent(name)}`),

  // Lyrics
  getLyrics: (id) => request(`/api/songs/${id}/lyrics`),
  saveLyrics: (id, lyricsText) => request(`/api/songs/${id}/lyrics`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lyrics_text: lyricsText })
  }),

  // Playback
  play: (songId, singerDevice, audienceDevice) => postJson('/api/songs/play', {
    song_id: songId,
    singer_device: singerDevice,
    audience_device: audienceDevice
  }),
  pause: () => request('/api/songs/pause', { method: 'POST' }),
  resume: () => request('/api/songs/resume', { method: 'POST' }),
  stop: () => request('/api/songs/stop', { method: 'POST' }),
  seek: (position) => postJson('/api/songs/seek', { position: parseFloat(position) }),
  setVolume: (singerVolume, audienceVolume) => postJson('/api/playback/volume', {
    singer_volume: singerVolume,
    audience_volume: audienceVolume
  }),

  // Devices / system
  getDevices: () => request('/api/devices'),
  playTestTone: (deviceId) => request(`/api/devices/${encodeURIComponent(deviceId)}/test-tone`, { method: 'POST' }),
  getGpuStatus: () => request('/api/system/gpu'),

  // Playlists
  getPlaylists: () => request('/api/playlists'),
  createPlaylist: (name, songIds) => postJson('/api/playlists', { name, song_ids: songIds }),
  deletePlaylist: (name) => request(`/api/playlists/${name}`, { method: 'DELETE' }),
  uploadPlaylistThumbnail: (name, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/api/playlists/${name}/thumbnail`, { method: 'POST', body: formData });
  }
};
