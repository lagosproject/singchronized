import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AppContext } from './app-context';
import { useDevices } from '../hooks/useDevices';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useLastPlayed } from '../hooks/useLastPlayed';
import { useLibrary } from '../hooks/useLibrary';
import { usePlayback } from '../hooks/usePlayback';
import { usePlaylists } from '../hooks/usePlaylists';
import { useQueue } from '../hooks/useQueue';

export function AppProvider({ children }) {
  const library = useLibrary();
  const devices = useDevices();
  const playlists = usePlaylists();
  const playback = usePlayback({ songs: library.songs, fetchSongs: library.fetchSongs });
  const { lastPlayed, recordPlayed } = useLastPlayed();

  // Whisper model size used for lyric transcription (AI settings)
  const [modelSize, setModelSize] = useState(() => localStorage.getItem('whisperModelSize') || 'base');

  useEffect(() => {
    localStorage.setItem('whisperModelSize', modelSize);
  }, [modelSize]);

  // Which song's "add to playlist" dropdown is open (closed by any outside click)
  const [activeDropdownSongId, setActiveDropdownSongId] = useState(null);

  // Modals
  const [editingSong, setEditingSong] = useState(null);
  const [createPlaylistModal, setCreatePlaylistModal] = useState({ open: false, presetSongIds: [] });

  const playSong = async (id, keepQueue = false) => {
    if (devices.singerDevice === null || devices.audienceDevice === null) {
      alert("Please select audio output devices first!");
      return;
    }
    try {
      await api.play(id, devices.singerDevice, devices.audienceDevice);
      library.fetchSongs();
      playback.setIsFullscreenLyrics(true);

      if (!keepQueue) {
        const song = library.songs.find(s => s.id === id);
        if (song) {
          queue.setQueueToSong(song);
        }
      }

      recordPlayed(id);
    } catch (err) {
      console.error(err);
    }
  };

  const queue = useQueue({
    isPlaying: playback.playback.is_playing,
    playSongById: playSong
  });

  const stopSong = async () => {
    queue.clearQueue();
    playback.stop();
  };

  useKeyboardShortcuts({
    playback: playback.playback,
    lyrics: playback.lyrics,
    pause: playback.pause,
    resume: playback.resume,
    seek: playback.seek,
    setIsFullscreenLyrics: playback.setIsFullscreenLyrics
  });

  // Close any open song dropdown when clicking elsewhere
  useEffect(() => {
    const handleOutsideClick = () => setActiveDropdownSongId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const openCreatePlaylistModal = (presetSongIds = []) => {
    setCreatePlaylistModal({ open: true, presetSongIds });
  };

  const closeCreatePlaylistModal = () => {
    setCreatePlaylistModal({ open: false, presetSongIds: [] });
  };

  const value = {
    library,
    devices,
    playlists,
    playback,
    queue,
    lastPlayed,
    modelSize,
    setModelSize,
    activeDropdownSongId,
    setActiveDropdownSongId,
    editingSong,
    setEditingSong,
    createPlaylistModal,
    openCreatePlaylistModal,
    closeCreatePlaylistModal,
    playSong,
    stopSong
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
