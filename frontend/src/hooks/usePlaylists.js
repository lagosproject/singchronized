import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';

export function usePlaylists() {
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);

  const fetchPlaylists = useCallback(async () => {
    try {
      const data = await api.getPlaylists();
      setPlaylists(data);
      setSelectedPlaylist(prev => {
        if (!prev) return prev;
        return data.find(p => p.name === prev.name) || null;
      });
    } catch (err) {
      console.error("Failed to fetch playlists:", err);
    }
  }, []);

  useEffect(() => {
    api.getPlaylists()
      .then(setPlaylists)
      .catch(err => console.error("Failed to fetch playlists:", err));
  }, []);

  const addSongToPlaylist = async (songId, playlist) => {
    const existingIds = playlist.songs.map(s => s.id);
    if (existingIds.includes(songId)) {
      alert("Song is already in this playlist");
      return;
    }
    try {
      await api.createPlaylist(playlist.name, [...existingIds, songId]);
      fetchPlaylists();
    } catch (err) {
      console.error(err);
      alert("Failed to add song to playlist");
    }
  };

  const deletePlaylist = async (name) => {
    if (!confirm(`Are you sure you want to delete the playlist "${name}"?`)) return;
    try {
      await api.deletePlaylist(name);
      setSelectedPlaylist(prev => (prev && prev.name === name ? null : prev));
      fetchPlaylists();
    } catch (err) {
      console.error(err);
      alert("Failed to delete playlist");
    }
  };

  return {
    playlists,
    selectedPlaylist,
    setSelectedPlaylist,
    fetchPlaylists,
    addSongToPlaylist,
    deletePlaylist
  };
}
