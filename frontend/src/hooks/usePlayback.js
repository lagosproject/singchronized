import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import { WS_BASE } from '../config';

export function usePlayback({ songs, fetchSongs }) {
  const [playback, setPlayback] = useState({ is_playing: false, is_paused: false, current_time: 0, song_id: null });
  const [loadedLyrics, setLoadedLyrics] = useState([]);
  const [isFullscreenLyrics, setIsFullscreenLyrics] = useState(false);
  const [singerVolume, setSingerVolume] = useState(() => {
    const v = localStorage.getItem('singerVolume');
    return v !== null ? parseFloat(v) : 1.0;
  });
  const [audienceVolume, setAudienceVolume] = useState(() => {
    const v = localStorage.getItem('audienceVolume');
    return v !== null ? parseFloat(v) : 1.0;
  });
  const [progressMap, setProgressMap] = useState({});

  useEffect(() => {
    api.setVolume(singerVolume, audienceVolume).catch(console.error);
  }, []);

  const wsRef = useRef(null);
  const fetchSongsRef = useRef(fetchSongs);
  const lyricsSongIdRef = useRef(null);
  const loadedLyricsRef = useRef([]);

  useEffect(() => {
    fetchSongsRef.current = fetchSongs;
  }, [fetchSongs]);

  useEffect(() => {
    loadedLyricsRef.current = loadedLyrics;
  }, [loadedLyrics]);

  // Song metadata for the currently playing track
  const playingSong = useMemo(() => {
    if (!playback.song_id) return null;
    return songs.find(s => s.id === playback.song_id) || null;
  }, [playback.song_id, songs]);

  // Hide stale lyrics once playback stops
  const lyrics = useMemo(() => (playingSong ? loadedLyrics : []), [playingSong, loadedLyrics]);

  useEffect(() => {
    const setupWebSocket = () => {
      if (wsRef.current) return;

      const ws = new WebSocket(`${WS_BASE}/api/ws/playback`);
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'playback_status') {
          setPlayback(msg.data);
          if (msg.data.singer_volume !== undefined) {
            setSingerVolume(msg.data.singer_volume);
            localStorage.setItem('singerVolume', msg.data.singer_volume);
          }
          if (msg.data.audience_volume !== undefined) {
            setAudienceVolume(msg.data.audience_volume);
            localStorage.setItem('audienceVolume', msg.data.audience_volume);
          }
        } else if (msg.type === 'progress_update') {
          const { song_id, action, progress, status } = msg.data;
          setProgressMap(prev => ({ ...prev, [`${action}_${song_id}`]: { progress, status } }));
          if (status === 'COMPLETED' || status === 'FAILED') {
            fetchSongsRef.current();
          }
        }
      };
      ws.onclose = () => {
        wsRef.current = null;
        // Reconnect after 3 seconds
        setTimeout(setupWebSocket, 3000);
      };
      wsRef.current = ws;
    };

    setupWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Index of the lyric line matching the current playback time
  const activeLyricIndex = useMemo(() => {
    let activeIdx = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= playback.current_time) {
        activeIdx = i;
      } else {
        break;
      }
    }
    return activeIdx;
  }, [playback.current_time, lyrics]);

  const fetchLyrics = async (songId) => {
    try {
      const data = await api.getLyrics(songId);
      lyricsSongIdRef.current = songId;
      setLoadedLyrics(data.lines || []);
    } catch (err) {
      console.error("Failed to fetch lyrics:", err);
    }
  };

  // Load lyrics when the playing song changes (or retry while it has none,
  // so freshly transcribed lyrics appear mid-song)
  useEffect(() => {
    if (!playingSong) return;
    if (loadedLyricsRef.current.length === 0 || lyricsSongIdRef.current !== playingSong.id) {
      fetchLyrics(playingSong.id);
    }
  }, [playingSong, songs]);

  const pause = () => api.pause().catch(console.error);
  const resume = () => api.resume().catch(console.error);
  const stop = () => api.stop().catch(console.error);

  const seek = async (position) => {
    try {
      await api.seek(position);
    } catch (err) {
      console.error("Failed to seek:", err);
    }
  };

  const updateVolume = async (sVol, aVol) => {
    try {
      const data = await api.setVolume(sVol, aVol);
      setSingerVolume(data.singer_volume);
      setAudienceVolume(data.audience_volume);
      localStorage.setItem('singerVolume', data.singer_volume);
      localStorage.setItem('audienceVolume', data.audience_volume);
    } catch (err) {
      console.error("Failed to update volume:", err);
    }
  };

  return {
    playback,
    lyrics,
    activeLyricIndex,
    playingSong,
    isFullscreenLyrics,
    setIsFullscreenLyrics,
    singerVolume,
    setSingerVolume,
    audienceVolume,
    setAudienceVolume,
    progressMap,
    fetchLyrics,
    pause,
    resume,
    stop,
    seek,
    updateVolume
  };
}
