import { useCallback, useEffect, useRef, useState } from 'react';

export function useQueue({ isPlaying, playSongById }) {
  const [queue, setQueue] = useState([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionCountdown, setTransitionCountdown] = useState(10);
  const [transitionTimerDuration, setTransitionTimerDuration] = useState(() => {
    return Number(localStorage.getItem('karaoke_queue_countdown') || 10);
  });

  const timerRef = useRef(null);
  const playSongRef = useRef(playSongById);
  const wasPlayingRef = useRef(false);

  useEffect(() => {
    playSongRef.current = playSongById;
  }, [playSongById]);

  const startCountdown = useCallback(() => {
    setIsTransitioning(true);
    setTransitionCountdown(transitionTimerDuration);
  }, [transitionTimerDuration]);

  const playNextInQueue = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsTransitioning(false);
    if (currentQueueIndex !== null && currentQueueIndex < queue.length - 1) {
      const nextIndex = currentQueueIndex + 1;
      setCurrentQueueIndex(nextIndex);
      playSongRef.current(queue[nextIndex].id, true);
    }
  }, [currentQueueIndex, queue]);

  const playPast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsTransitioning(false);
    if (currentQueueIndex !== null && currentQueueIndex >= 0 && currentQueueIndex < queue.length) {
      playSongRef.current(queue[currentQueueIndex].id, true);
    }
  }, [currentQueueIndex, queue]);

  const playNextOfNext = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsTransitioning(false);
    if (currentQueueIndex !== null && currentQueueIndex < queue.length - 2) {
      const nextNextIndex = currentQueueIndex + 2;
      setCurrentQueueIndex(nextNextIndex);
      playSongRef.current(queue[nextNextIndex].id, true);
    }
  }, [currentQueueIndex, queue]);

  const cancelCountdown = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsTransitioning(false);
    setCurrentQueueIndex(null);
    setQueue([]);
  };

  const addToQueue = (song) => {
    setQueue(prev => {
      const updated = [...prev, song];
      if (prev.length === 0) {
        // If queue was empty, make this current song and play it
        setCurrentQueueIndex(0);
        // Delay playing slightly to ensure state is committed
        setTimeout(() => {
          playSongRef.current(song.id, true);
        }, 50);
      }
      return updated;
    });
  };

  const removeFromQueue = (index) => {
    setQueue(prev => prev.filter((_, idx) => idx !== index));
    if (currentQueueIndex === index) {
      setCurrentQueueIndex(null);
    } else if (currentQueueIndex > index) {
      setCurrentQueueIndex(prev => prev - 1);
    }
  };

  const clearQueue = () => {
    setQueue([]);
    setCurrentQueueIndex(null);
  };

  const setQueueToSong = (song) => {
    setQueue([song]);
    setCurrentQueueIndex(0);
  };

  const setQueueList = (songsList, startIndex = 0) => {
    setQueue(songsList);
    setCurrentQueueIndex(startIndex);
  };

  const updateTransitionTimerDuration = (seconds) => {
    setTransitionTimerDuration(seconds);
    localStorage.setItem('karaoke_queue_countdown', seconds);
  };

  // Countdown ticker: decrement once per second, fire the next song at zero
  useEffect(() => {
    if (!isTransitioning) return;
    const delay = transitionCountdown > 0 ? 1000 : 0;
    timerRef.current = setTimeout(() => {
      if (transitionCountdown > 0) {
        setTransitionCountdown(transitionCountdown - 1);
      } else {
        playNextInQueue();
      }
    }, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isTransitioning, transitionCountdown, playNextInQueue]);

  // Start countdown to the next track when the current song ends naturally
  useEffect(() => {
    const wasPlaying = wasPlayingRef.current;
    wasPlayingRef.current = isPlaying;
    if (wasPlaying && !isPlaying &&
        queue.length > 0 && currentQueueIndex !== null && currentQueueIndex < queue.length - 1) {
      // Defer so the transition overlay state change happens outside the effect body
      const id = setTimeout(startCountdown, 0);
      return () => clearTimeout(id);
    }
  }, [isPlaying, queue, currentQueueIndex, startCountdown]);

  return {
    queue,
    currentQueueIndex,
    isTransitioning,
    transitionCountdown,
    transitionTimerDuration,
    updateTransitionTimerDuration,
    addToQueue,
    removeFromQueue,
    clearQueue,
    setQueueToSong,
    setQueueList,
    playNextInQueue,
    cancelCountdown,
    startCountdown,
    playPast,
    playNextOfNext
  };
}

