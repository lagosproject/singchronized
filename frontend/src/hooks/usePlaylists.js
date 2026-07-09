import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { t } from '../i18n';

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
      alert(t("songInPlaylistAlready"));
      return;
    }
    try {
      await api.createPlaylist(playlist.name, [...existingIds, songId]);
      fetchPlaylists();
    } catch (err) {
      console.error(err);
      alert(t("failedAddSongToPlaylist"));
    }
  };

  const deletePlaylist = async (name) => {
    if (!confirm(t("confirmDeletePlaylist", { name }))) return;
    try {
      await api.deletePlaylist(name);
      setSelectedPlaylist(prev => (prev && prev.name === name ? null : prev));
      fetchPlaylists();
    } catch (err) {
      console.error(err);
      alert(t("failedDeletePlaylist"));
    }
  };

  const renamePlaylist = async (oldName, newName) => {
    try {
      const data = await api.renamePlaylist(oldName, newName);
      const updatedName = data.name;
      await fetchPlaylists();
      setSelectedPlaylist(prev => {
        if (prev && prev.name === oldName) {
          return { ...prev, name: updatedName };
        }
        return prev;
      });
    } catch (err) {
      console.error(err);
      alert(err.message || t("failedRenamePlaylist"));
    }
  };

  return {
    playlists,
    selectedPlaylist,
    setSelectedPlaylist,
    fetchPlaylists,
    addSongToPlaylist,
    deletePlaylist,
    renamePlaylist
  };
}
