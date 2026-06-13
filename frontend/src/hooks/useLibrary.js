import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';

export function useLibrary() {
  const [songs, setSongs] = useState([]);
  const [processingSongs, setProcessingSongs] = useState({});

  const fetchSongs = useCallback(async () => {
    try {
      setSongs(await api.getSongs());
    } catch (err) {
      console.error("Failed to fetch songs:", err);
    }
  }, []);

  // Initial load + polling fallback to keep song AI statuses updated in background
  useEffect(() => {
    api.getSongs()
      .then(setSongs)
      .catch(err => console.error("Failed to fetch songs:", err));
    const interval = setInterval(fetchSongs, 4000);
    return () => clearInterval(interval);
  }, [fetchSongs]);

  const deleteSong = async (id) => {
    if (!confirm("Are you sure you want to delete this song? This will remove all files.")) return;
    try {
      await api.deleteSong(id);
      fetchSongs();
    } catch (err) {
      console.error("Failed to delete song:", err);
    }
  };

  const startSplit = async (id) => {
    try {
      setProcessingSongs(prev => ({ ...prev, [id]: { ...prev[id], split: true } }));
      await api.splitSong(id);
      fetchSongs();
    } catch (err) {
      console.error(err);
    }
  };

  const generateLyrics = async (id, modelSize) => {
    try {
      setProcessingSongs(prev => ({ ...prev, [id]: { ...prev[id], lyrics: true } }));
      await api.generateLyrics(id, modelSize);
      fetchSongs();
    } catch (err) {
      console.error(err);
    }
  };

  const splitAll = async () => {
    try {
      await api.splitAll();
      fetchSongs();
    } catch (err) {
      console.error(err);
    }
  };

  const generateLyricsAll = async (modelSize) => {
    try {
      await api.generateLyricsAll(modelSize);
      fetchSongs();
    } catch (err) {
      console.error(err);
    }
  };

  return {
    songs,
    processingSongs,
    fetchSongs,
    deleteSong,
    startSplit,
    generateLyrics,
    splitAll,
    generateLyricsAll
  };
}
