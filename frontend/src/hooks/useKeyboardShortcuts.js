import { useEffect } from 'react';

export function useKeyboardShortcuts({ playback, lyrics, pause, resume, seek, setIsFullscreenLyrics }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return;
      }

      if (!playback.is_playing) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (playback.is_paused) {
          resume();
        } else {
          pause();
        }
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        const totalDuration = playback.duration || (lyrics.length > 0 ? (lyrics[lyrics.length - 1].time + 10) : 300);
        seek(Math.min(playback.current_time + 5, totalDuration));
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seek(Math.max(playback.current_time - 5, 0));
      } else if (e.code === 'Escape') {
        setIsFullscreenLyrics(false);
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsFullscreenLyrics(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playback, lyrics, pause, resume, seek, setIsFullscreenLyrics]);
}
