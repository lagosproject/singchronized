import { useState } from 'react';

const STORAGE_KEY = 'karaoke_last_played';
const HISTORY_SIZE = 8;

export function useLastPlayed() {
  const [lastPlayed, setLastPlayed] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const recordPlayed = (songId) => {
    setLastPlayed(prev => {
      const filtered = prev.filter(id => id !== songId);
      const updated = [songId, ...filtered].slice(0, HISTORY_SIZE);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return { lastPlayed, recordPlayed };
}
