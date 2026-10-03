import { useState, useEffect, useRef, useCallback } from 'react';
import { PLAYBACK_SPEEDS } from '../data/quranMeta';

// CDN Base URL for Quran Ayah MP3s (128kbps)
const CDN_BASE_URL = 'https://cdn.islamic.network/quran/audio/128';

/**
 * Helper to compute legitimate Al Quran Cloud CDN audio URL
 * Format: https://cdn.islamic.network/quran/audio/128/{edition}/{globalAyahNumber}.mp3
 */
export function getAyahAudioUrl(ayah, reciter) {
  if (!ayah || !ayah.number) return '';
  const edition = reciter?.id || 'ar.alafasy';
  return `${CDN_BASE_URL}/${edition}/${ayah.number}.mp3`;
}

export function useQuranAudio({
  ayahs = [],
  viewMode = 'surah',
  currentSurah,
  currentJuz
}) {
  // Dual-Player Audio Elements for Gapless Preloading
  const player1Ref = useRef(null);
  const player2Ref = useRef(null);
  const activePlayerRef = useRef(1); // 1 or 2

  const getActiveAudio = () => activePlayerRef.current === 1 ? player1Ref.current : player2Ref.current;
  const getIdleAudio = () => activePlayerRef.current === 1 ? player2Ref.current : player1Ref.current;

  // Audio Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(() => {
    const saved = localStorage.getItem('quran_playback_speed');
    return saved ? parseFloat(saved) : 1;
  });
  const [audioProgress, setAudioProgress] = useState({ currentTime: 0, duration: 0 });
  const [errorMessage, setErrorMessage] = useState(null);

  // Reciter selection state
  const [reciter, setReciter] = useState(() => {
    const savedId = localStorage.getItem('quran_reciter_id');
    return { id: savedId || 'ar.alafasy', name: 'Mishary Rashid Alafasy' };
  });

  // Repetition Engine State
  const [playbackMode, setPlaybackMode] = useState('normal'); // 'normal' | 'ayah' | 'range' | 'surah' | 'juz'
  const [repeatTarget, setRepeatTarget] = useState(1);         // number or 'infinity'
  const [currentCycle, setCurrentCycle] = useState(1);

  // Range configuration
  const [rangeSurahNumber, setRangeSurahNumber] = useState(null); // specific surah number in juz mode
  const [rangeStart, setRangeStart] = useState(1); // 1-based ayah number in surah
  const [rangeEnd, setRangeEnd] = useState(1);     // 1-based ayah number in surah
  const [rangeRepeatCount, setRangeRepeatCount] = useState(3);

  // Quick repetition memory for active surah/juz
  const [surahRepeatCount, setSurahRepeatCount] = useState(1);
  const [juzRepeatCount, setJuzRepeatCount] = useState(1);

  // Store latest state in refs for audio event listeners
  const stateRef = useRef({
    ayahs,
    currentAyahIndex,
    playbackMode,
    repeatTarget,
    currentCycle,
    rangeSurahNumber,
    rangeStart,
    rangeEnd,
    reciter,
    playbackSpeed
  });

  useEffect(() => {
    stateRef.current = {
      ayahs,
      currentAyahIndex,
      playbackMode,
      repeatTarget,
      currentCycle,
      rangeSurahNumber,
      rangeStart,
      rangeEnd,
      reciter,
      playbackSpeed
    };
  }, [ayahs, currentAyahIndex, playbackMode, repeatTarget, currentCycle, rangeSurahNumber, rangeStart, rangeEnd, reciter, playbackSpeed]);

  // Forward declaration for handleAudioEnded
  const handleAudioEndedRef = useRef(null);

  // Initialize Dual-Audio Elements once for Gapless Audio
  useEffect(() => {
    const audio1 = new Audio();
    const audio2 = new Audio();
    audio1.preload = 'auto';
    audio2.preload = 'auto';

    player1Ref.current = audio1;
    player2Ref.current = audio2;

    const setupListeners = (audio, playerNum) => {
      const handlePlay = () => {
        if (activePlayerRef.current === playerNum) {
          setIsPlaying(true);
        }
      };
      const handlePause = () => {
        if (activePlayerRef.current === playerNum) {
          setIsPlaying(false);
        }
      };
      const handleWaiting = () => {
        if (activePlayerRef.current === playerNum) {
          setIsBuffering(true);
        }
      };
      const handlePlaying = () => {
        if (activePlayerRef.current === playerNum) {
          setIsBuffering(false);
        }
      };
      const handleCanPlay = () => {
        if (activePlayerRef.current === playerNum) {
          setIsBuffering(false);
        }
      };
      const handleTimeUpdate = () => {
        if (activePlayerRef.current === playerNum) {
          setAudioProgress({
            currentTime: audio.currentTime || 0,
            duration: audio.duration || 0
          });
        }
      };
      const handleEnded = () => {
        if (activePlayerRef.current === playerNum) {
          if (handleAudioEndedRef.current) {
            handleAudioEndedRef.current();
          }
        }
      };
      const handleError = (e) => {
        if (activePlayerRef.current === playerNum) {
          if (!audio.getAttribute('src') || !audio.src || audio.src === window.location.href || audio.src.endsWith('/')) {
            return;
          }
          console.warn(`Audio Player ${playerNum} error:`, e);
          setIsBuffering(false);
          setIsPlaying(false);
          setErrorMessage('Audio playback encountered an issue. Reconnecting...');
          setTimeout(() => setErrorMessage(null), 4000);
        }
      };

      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('waiting', handleWaiting);
      audio.addEventListener('playing', handlePlaying);
      audio.addEventListener('canplay', handleCanPlay);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);

      return () => {
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('waiting', handleWaiting);
        audio.removeEventListener('playing', handlePlaying);
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
      };
    };

    const cleanup1 = setupListeners(audio1, 1);
    const cleanup2 = setupListeners(audio2, 2);

    return () => {
      cleanup1();
      cleanup2();
      audio1.pause();
      audio2.pause();
      audio1.removeAttribute('src');
      audio2.removeAttribute('src');
      player1Ref.current = null;
      player2Ref.current = null;
    };
  }, []);

  // Update playback speed when state changes
  useEffect(() => {
    if (player1Ref.current) player1Ref.current.playbackRate = playbackSpeed;
    if (player2Ref.current) player2Ref.current.playbackRate = playbackSpeed;
    localStorage.setItem('quran_playback_speed', playbackSpeed.toString());
  }, [playbackSpeed]);

  // Update reciter persistence
  useEffect(() => {
    if (reciter?.id) {
      localStorage.setItem('quran_reciter_id', reciter.id);
    }
  }, [reciter]);

  // Reset range and index to beginning whenever switching surah, juz, or viewMode
  useEffect(() => {
    setCurrentAyahIndex(0);
    setPlaybackMode('normal');
    setCurrentCycle(1);
    setAudioProgress({ currentTime: 0, duration: 0 });
    [player1Ref.current, player2Ref.current].forEach(audio => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.removeAttribute('src');
        audio.load();
      }
    });
  }, [viewMode, currentSurah?.number, currentJuz]);

  // When ayahs array finishes loading/updating
  useEffect(() => {
    if (ayahs && ayahs.length > 0) {
      setCurrentAyahIndex(0);
      setRangeStart(ayahs[0].numberInSurah);
      setRangeEnd(ayahs[Math.min(ayahs.length - 1, 4)].numberInSurah);
    }
  }, [ayahs]);

  // Calculate the next Ayah index given current index and repetition configuration
  const computeNextAyahIndex = useCallback((currentIndex) => {
    const {
      ayahs: list,
      playbackMode: mode,
      repeatTarget: target,
      currentCycle: cycle,
      rangeStart: rStart,
      rangeEnd: rEnd,
      rangeSurahNumber: rSurah
    } = stateRef.current;

    if (!list || list.length === 0) return null;

    if (mode === 'normal' || mode === 'juz') {
      if (currentIndex < list.length - 1) {
        return currentIndex + 1;
      }
      if (mode === 'juz') {
        const isInfinite = target === 'infinity';
        if (isInfinite || cycle < target) {
          return 0;
        }
      }
      return null;
    }

    if (mode === 'surah') {
      if (currentIndex < list.length - 1) {
        return currentIndex + 1;
      }
      const isInfinite = target === 'infinity';
      if (isInfinite || cycle < target) {
        return 0;
      }
      return null;
    }

    if (mode === 'ayah') {
      const isInfinite = target === 'infinity';
      if (isInfinite || cycle < target) {
        return currentIndex;
      }
      return null;
    }

    if (mode === 'range') {
      let startIndex = 0;
      let endIndex = Math.min(list.length - 1, 4);

      const startFound = list.findIndex(a => (!rSurah || a.surahNumber === rSurah) && a.numberInSurah === rStart);
      const endFound = list.findIndex(a => (!rSurah || a.surahNumber === rSurah) && a.numberInSurah === rEnd);
      if (startFound !== -1 && endFound !== -1) {
        startIndex = Math.min(startFound, endFound);
        endIndex = Math.max(startFound, endFound);
      }
      if (currentIndex < endIndex) {
        return currentIndex + 1;
      }
      const isInfinite = target === 'infinity';
      if (isInfinite || cycle < target) {
        return startIndex;
      }
      return null;
    }

    return null;
  }, []);

  // Preload the next Ayah into the idle audio element for ZERO pause
  const preloadNextAyah = useCallback((currentIndex) => {
    const nextIdx = computeNextAyahIndex(currentIndex);
    if (nextIdx === null) return;

    const list = stateRef.current.ayahs;
    if (!list || !list[nextIdx]) return;

    const nextAyah = list[nextIdx];
    const nextUrl = getAyahAudioUrl(nextAyah, stateRef.current.reciter);
    const idleAudio = getIdleAudio();

    if (idleAudio && nextUrl) {
      if (idleAudio.src !== nextUrl) {
        idleAudio.src = nextUrl;
        idleAudio.playbackRate = stateRef.current.playbackSpeed;
        idleAudio.preload = 'auto';
        idleAudio.load();
      }
    }
  }, [computeNextAyahIndex]);

  // Load and play audio with seamless gapless transition using preloaded audio
  const loadAndPlayAyah = useCallback((index, speed = null) => {
    const list = stateRef.current.ayahs;
    if (!list || list.length === 0 || index < 0 || index >= list.length) {
      return;
    }

    const ayah = list[index];
    const currentReciter = stateRef.current.reciter;
    const url = getAyahAudioUrl(ayah, currentReciter);
    const rate = speed !== null ? speed : stateRef.current.playbackSpeed;

    setCurrentAyahIndex(index);
    setErrorMessage(null);

    try {
      localStorage.setItem('quran_last_ayah_number', ayah.numberInSurah?.toString() || '1');
    } catch {}

    const idleAudio = getIdleAudio();
    const activeAudio = getActiveAudio();

    // Check if idle audio has ALREADY preloaded this Ayah!
    if (idleAudio && idleAudio.src === url && idleAudio.readyState >= 2) {
      // Instant switch: swap players with 0ms network latency!
      activePlayerRef.current = activePlayerRef.current === 1 ? 2 : 1;
      const newActive = getActiveAudio();
      const newIdle = getIdleAudio();

      if (newIdle) {
        newIdle.pause();
        newIdle.currentTime = 0;
      }

      newActive.playbackRate = rate;
      newActive.currentTime = 0;
      const playPromise = newActive.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          if (err.name !== 'AbortError') {
            console.warn('Play was prevented:', err);
            setIsPlaying(false);
          }
        });
      }

      // Preload next upcoming verse in background
      preloadNextAyah(index);
      return;
    }

    // Fallback: load directly on active player
    if (!activeAudio) return;
    if (activeAudio.src !== url) {
      activeAudio.src = url;
    }
    activeAudio.playbackRate = rate;
    activeAudio.currentTime = 0;

    const playPromise = activeAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        if (err.name !== 'AbortError') {
          console.warn('Play was prevented or failed:', err);
          setIsPlaying(false);
        }
      });
    }

    // Immediately preload the next verse into idle player
    preloadNextAyah(index);
  }, [preloadNextAyah]);

  // Central Audio Ended Handler
  const handleAudioEnded = useCallback(() => {
    const {
      ayahs: list,
      currentAyahIndex: idx,
      playbackMode: mode,
      repeatTarget: target,
      currentCycle: cycle,
      rangeStart: rStart,
      rangeEnd: rEnd,
      rangeSurahNumber: rSurah
    } = stateRef.current;

    if (!list || list.length === 0) return;

    // Normal Mode: Play sequential, stop at end
    if (mode === 'normal') {
      if (idx < list.length - 1) {
        loadAndPlayAyah(idx + 1);
      } else {
        setIsPlaying(false);
      }
      return;
    }

    // Ayah Repetition Mode
    if (mode === 'ayah') {
      const isInfinite = target === 'infinity';
      if (isInfinite || cycle < target) {
        setCurrentCycle(prev => prev + 1);
        const active = getActiveAudio();
        if (active) {
          active.currentTime = 0;
          active.play().catch(console.warn);
        }
      } else {
        setIsPlaying(false);
        setPlaybackMode('normal');
      }
      return;
    }

    // Range Repetition Mode
    if (mode === 'range') {
      let startIndex = 0;
      let endIndex = Math.min(list.length - 1, 4);

      const startFound = list.findIndex(a => (!rSurah || a.surahNumber === rSurah) && a.numberInSurah === rStart);
      const endFound = list.findIndex(a => (!rSurah || a.surahNumber === rSurah) && a.numberInSurah === rEnd);

      if (startFound !== -1 && endFound !== -1) {
        startIndex = Math.min(startFound, endFound);
        endIndex = Math.max(startFound, endFound);
      } else {
        const normStart = Math.min(rStart, rEnd);
        const normEnd = Math.max(rStart, rEnd);
        startIndex = Math.max(0, Math.min(list.length - 1, normStart - 1));
        endIndex = Math.max(0, Math.min(list.length - 1, normEnd - 1));
      }

      if (idx < endIndex) {
        loadAndPlayAyah(idx + 1);
      } else {
        const isInfinite = target === 'infinity';
        if (isInfinite || cycle < target) {
          setCurrentCycle(prev => prev + 1);
          loadAndPlayAyah(startIndex);
        } else {
          setIsPlaying(false);
        }
      }
      return;
    }

    // Surah Repetition Mode
    if (mode === 'surah') {
      if (idx < list.length - 1) {
        loadAndPlayAyah(idx + 1);
      } else {
        const isInfinite = target === 'infinity';
        if (isInfinite || cycle < target) {
          setCurrentCycle(prev => prev + 1);
          loadAndPlayAyah(0);
        } else {
          setIsPlaying(false);
        }
      }
      return;
    }

    // Juz Repetition Mode (Continuous Tilawah across whole Juz)
    if (mode === 'juz') {
      if (idx < list.length - 1) {
        loadAndPlayAyah(idx + 1);
      } else {
        const isInfinite = target === 'infinity';
        if (isInfinite || cycle < target) {
          setCurrentCycle(prev => prev + 1);
          loadAndPlayAyah(0);
        } else {
          setIsPlaying(false);
        }
      }
      return;
    }
  }, [loadAndPlayAyah]);

  // Keep ref up to date for event listener
  useEffect(() => {
    handleAudioEndedRef.current = handleAudioEnded;
  }, [handleAudioEnded]);

  // Actions

  // 1. Play / Pause toggle
  const togglePlayPause = useCallback(() => {
    const active = getActiveAudio();
    if (!active) return;

    if (isPlaying) {
      active.pause();
    } else {
      if (!active.src || active.src === window.location.href) {
        loadAndPlayAyah(currentAyahIndex);
      } else {
        active.play().catch(err => {
          if (err.name !== 'AbortError') {
            loadAndPlayAyah(currentAyahIndex);
          }
        });
      }
    }
  }, [isPlaying, currentAyahIndex, loadAndPlayAyah]);

  // 2. Play specific Ayah by index
  const playAyah = useCallback((index) => {
    setPlaybackMode('normal');
    setRepeatTarget(1);
    setCurrentCycle(1);
    loadAndPlayAyah(index);
  }, [loadAndPlayAyah]);

  // 3. Repeat a single Ayah with a target count
  const repeatSingleAyah = useCallback((index, count) => {
    setPlaybackMode('ayah');
    setRepeatTarget(count);
    setCurrentCycle(1);
    loadAndPlayAyah(index);
  }, [loadAndPlayAyah]);

  // 4. Start / Repeat Range
  const startRangeRepetition = useCallback((start, end, count, surahNum = null) => {
    const list = stateRef.current.ayahs;
    if (!list || list.length === 0) return;

    let targetSurah = surahNum || stateRef.current.rangeSurahNumber;
    if (!targetSurah && list.length > 0) {
      targetSurah = list[0].surahNumber;
    }

    let startIndex = 0;
    let endIndex = Math.min(list.length - 1, 4);

    const startFound = list.findIndex(a => (!targetSurah || a.surahNumber === targetSurah) && a.numberInSurah === start);
    const endFound = list.findIndex(a => (!targetSurah || a.surahNumber === targetSurah) && a.numberInSurah === end);

    if (startFound !== -1 && endFound !== -1) {
      startIndex = Math.min(startFound, endFound);
      endIndex = Math.max(startFound, endFound);
    } else {
      const normStart = Math.min(start, end);
      const normEnd = Math.max(start, end);
      startIndex = Math.max(0, Math.min(list.length - 1, normStart - 1));
      endIndex = Math.max(0, Math.min(list.length - 1, normEnd - 1));
    }

    const finalStart = list[startIndex].numberInSurah;
    const finalEnd = list[endIndex].numberInSurah;
    const finalSurah = list[startIndex].surahNumber;
    const finalCount = count || rangeRepeatCount || 1;

    setRangeSurahNumber(finalSurah);
    setRangeStart(finalStart);
    setRangeEnd(finalEnd);
    setRangeRepeatCount(finalCount);
    setPlaybackMode('range');
    setRepeatTarget(finalCount);
    setCurrentCycle(1);

    loadAndPlayAyah(startIndex);
  }, [rangeRepeatCount, loadAndPlayAyah]);

  // 5. Repeat entire Surah
  const repeatSurah = useCallback((count) => {
    if (!ayahs || ayahs.length === 0) return;
    const finalCount = count || surahRepeatCount || 1;
    setSurahRepeatCount(finalCount);
    setPlaybackMode('surah');
    setRepeatTarget(finalCount);
    setCurrentCycle(1);
    loadAndPlayAyah(0);
  }, [ayahs, surahRepeatCount, loadAndPlayAyah]);

  // 6. Repeat entire Juz
  const repeatJuz = useCallback((count) => {
    if (!ayahs || ayahs.length === 0) return;
    const finalCount = count || juzRepeatCount || 1;
    setJuzRepeatCount(finalCount);
    setPlaybackMode('juz');
    setRepeatTarget(finalCount);
    setCurrentCycle(1);
    loadAndPlayAyah(0);
  }, [ayahs, juzRepeatCount, loadAndPlayAyah]);

  // 7. Stop completely and reset repetition state
  const stopPlayback = useCallback(() => {
    [player1Ref.current, player2Ref.current].forEach(audio => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
    setIsPlaying(false);
    setIsBuffering(false);
    setPlaybackMode('normal');
    setCurrentCycle(1);
    setAudioProgress({ currentTime: 0, duration: 0 });
  }, []);

  // 8. Next Ayah
  const nextAyah = useCallback(() => {
    const { ayahs: list, currentAyahIndex: idx, playbackMode: mode, rangeEnd: rEnd } = stateRef.current;
    if (!list || list.length === 0) return;

    if (mode === 'range') {
      const maxIndex = Math.min(list.length - 1, rEnd - 1);
      if (idx < maxIndex) {
        loadAndPlayAyah(idx + 1);
      }
    } else {
      if (idx < list.length - 1) {
        loadAndPlayAyah(idx + 1);
      }
    }
  }, [loadAndPlayAyah]);

  // 9. Previous Ayah
  const prevAyah = useCallback(() => {
    const { currentAyahIndex: idx, playbackMode: mode, rangeStart: rStart } = stateRef.current;
    const active = getActiveAudio();

    if (active && active.currentTime > 2) {
      active.currentTime = 0;
      return;
    }

    if (mode === 'range') {
      const minIndex = Math.max(0, rStart - 1);
      if (idx > minIndex) {
        loadAndPlayAyah(idx - 1);
      } else {
        if (active) active.currentTime = 0;
      }
    } else {
      if (idx > 0) {
        loadAndPlayAyah(idx - 1);
      } else {
        if (active) active.currentTime = 0;
      }
    }
  }, [loadAndPlayAyah]);

  // 10. Change Playback Speed (immediate effect)
  const changePlaybackSpeed = useCallback((speed) => {
    if (!PLAYBACK_SPEEDS.includes(speed)) return;
    setPlaybackSpeed(speed);
    if (player1Ref.current) player1Ref.current.playbackRate = speed;
    if (player2Ref.current) player2Ref.current.playbackRate = speed;
  }, []);

  // 11. Change Reciter (preserves current position and continues smoothly if playing)
  const changeReciter = useCallback((newReciter) => {
    setReciter(newReciter);
    const active = getActiveAudio();
    const { ayahs: list, currentAyahIndex: idx } = stateRef.current;

    if (active && list && list[idx]) {
      const wasPlaying = !active.paused;
      const curTime = active.currentTime;
      const newUrl = getAyahAudioUrl(list[idx], newReciter);

      active.src = newUrl;
      active.playbackRate = stateRef.current.playbackSpeed;
      active.currentTime = curTime;

      if (wasPlaying) {
        active.play().catch(console.warn);
      }

      // Preload next with new reciter
      preloadNextAyah(idx);
    }
  }, [preloadNextAyah]);

  // 12. Seek audio
  const seekAudio = useCallback((time) => {
    const active = getActiveAudio();
    if (active && Number.isFinite(time)) {
      active.currentTime = time;
    }
  }, []);

  return {
    // Audio State
    isPlaying,
    isBuffering,
    currentAyahIndex,
    currentAyah: ayahs?.[currentAyahIndex] || null,
    playbackSpeed,
    reciter,
    audioProgress,
    errorMessage,

    // Repetition State
    playbackMode,
    repeatTarget,
    currentCycle,

    // Range Configuration
    rangeSurahNumber,
    setRangeSurahNumber,
    rangeStart,
    rangeEnd,
    rangeRepeatCount,
    setRangeStart,
    setRangeEnd,
    setRangeRepeatCount,

    // Surah / Juz Repetition Configuration
    surahRepeatCount,
    setSurahRepeatCount,
    juzRepeatCount,
    setJuzRepeatCount,

    // Actions
    togglePlayPause,
    playAyah,
    repeatSingleAyah,
    startRangeRepetition,
    repeatSurah,
    repeatJuz,
    stopPlayback,
    nextAyah,
    prevAyah,
    changePlaybackSpeed,
    changeReciter,
    seekAudio
  };
}
