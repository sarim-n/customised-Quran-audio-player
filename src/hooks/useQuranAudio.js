import { useState, useEffect, useRef, useCallback } from 'react';
import { PLAYBACK_SPEEDS } from '../data/quranMeta';
import { getAyahAudioUrl } from '../services/quranApi';
import { getOfflineAudioBlob } from '../services/offlineStorage';

export { getAyahAudioUrl };

export function useQuranAudio({
  ayahs = [],
  viewMode = 'surah',
  currentSurah,
  currentJuz
}) {
  // Single Persistent Audio Element for 100% reliable background playback on Mobile / iOS / Android
  const audioRef = useRef(null);
  
  // Silent audio loop anchor to prevent mobile OS power-savers from suspending background execution
  const silentAudioRef = useRef(null);

  // Transition flag: prevents premature 'pause' state & MediaSession teardown when moving between verses
  const isTransitioningRef = useRef(false);

  // Offline Audio Blob and Request tracking
  const currentBlobUrlRef = useRef(null);
  const currentPlayingUrlRef = useRef(null);
  const playRequestIdRef = useRef(0);


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
  const [rangeStart, setRangeStart] = useState(null); // 1-based ayah number in surah
  const [rangeEnd, setRangeEnd] = useState(null);     // 1-based ayah number in surah
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

  // Initialize Single Audio Element and Silent Anchor once on mount
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
    audioRef.current = audio;

    const silentAudio = new Audio('/silence.wav');
    silentAudio.preload = 'auto';
    silentAudio.loop = true;
    silentAudio.volume = 0.01;
    silentAudio.setAttribute('playsinline', 'true');
    silentAudio.setAttribute('webkit-playsinline', 'true');
    silentAudioRef.current = silentAudio;

    const handlePlay = () => {
      setIsPlaying(true);
      // Keep silent audio anchor active during background playback
      if (silentAudioRef.current && silentAudioRef.current.paused) {
        silentAudioRef.current.play().catch(() => {});
      }
    };

    const handlePause = () => {
      // If the audio paused because it finished the track and is transitioning to the next verse or looping,
      // do NOT trigger a user pause or set MediaSession to paused!
      if (audio.ended || isTransitioningRef.current) {
        return;
      }
      setIsPlaying(false);
      if (silentAudioRef.current && !silentAudioRef.current.paused) {
        silentAudioRef.current.pause();
      }
    };

    const handleWaiting = () => {
      setIsBuffering(true);
    };

    const handlePlaying = () => {
      setIsBuffering(false);
    };

    const handleCanPlay = () => {
      setIsBuffering(false);
    };

    const handleTimeUpdate = () => {
      setAudioProgress({
        currentTime: audio.currentTime || 0,
        duration: audio.duration || 0
      });

      if ('mediaSession' in navigator && audio.duration && Number.isFinite(audio.duration) && audio.duration > 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration: audio.duration,
            playbackRate: audio.playbackRate || 1,
            position: Math.min(audio.currentTime || 0, audio.duration)
          });
        } catch {}
      }
    };

    const handleEnded = () => {
      if (handleAudioEndedRef.current) {
        handleAudioEndedRef.current();
      }
    };

    const handleError = async (e) => {
      if (!audio.getAttribute('src') || !audio.src || audio.src === window.location.href || audio.src.endsWith('/')) {
        return;
      }
      console.warn('Audio Player error:', e);

      // Offline recovery: If network playback failed and audio.src was not a blob, try loading from offline cache
      const currentUrl = currentPlayingUrlRef.current;
      if (currentUrl && !audio.src.startsWith('blob:')) {
        try {
          const offlineBlob = await getOfflineAudioBlob(currentUrl);
          if (offlineBlob) {
            audio.src = offlineBlob;
            currentBlobUrlRef.current = offlineBlob;
            audio.currentTime = 0;
            audio.play().catch(console.warn);
            return;
          }
        } catch {}
      }

      setIsBuffering(false);
      setIsPlaying(false);
      setErrorMessage('Audio playback encountered an issue. Reconnecting...');
      setTimeout(() => setErrorMessage(null), 4000);
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
      audio.pause();
      audio.removeAttribute('src');
      if (silentAudio) {
        silentAudio.pause();
        silentAudio.removeAttribute('src');
      }
      if (currentBlobUrlRef.current && currentBlobUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
        currentBlobUrlRef.current = null;
      }
      audioRef.current = null;
      silentAudioRef.current = null;
    };
  }, []);

  // Update playback speed when state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
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
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute('src');
      audio.load();
    }
    if (silentAudioRef.current) {
      silentAudioRef.current.pause();
    }
  }, [viewMode, currentSurah?.number, currentJuz]);

  // When ayahs array finishes loading/updating
  useEffect(() => {
    if (ayahs && ayahs.length > 0) {
      setCurrentAyahIndex(0);
    }
  }, [ayahs]);

  // Screen Wake Lock API: keeps screen alive while recitation is actively playing
  const wakeLockRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isPlaying && !wakeLockRef.current) {
        try {
          const lock = await navigator.wakeLock.request('screen');
          if (isMounted) {
            wakeLockRef.current = lock;
            lock.addEventListener('release', () => {
              wakeLockRef.current = null;
            });
          } else {
            lock.release();
          }
        } catch {}
      }
    };

    const releaseWakeLock = () => {
      if (wakeLockRef.current) {
        try {
          wakeLockRef.current.release();
        } catch {}
        wakeLockRef.current = null;
      }
    };

    if (isPlaying) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isPlaying) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying]);

  // Media Session API: registers lock-screen player controls & metadata for background audio
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const list = stateRef.current.ayahs;
    const currentVerse = list?.[currentAyahIndex];
    if (!currentVerse) return;

    const surahTitle = currentVerse.surahEnglishName || currentSurah?.englishName || 'Surah';
    const title = `${surahTitle} - Ayah ${currentVerse.numberInSurah}`;
    const artist = reciter?.name || 'Quran Reciter';
    const album = viewMode === 'juz' ? `Juz ${currentJuz}` : (currentSurah?.englishName || 'Quran Memorizer');

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist,
        album,
        artwork: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
        ]
      });

      // Do NOT set playbackState to paused if transitioning between verses
      if (!isTransitioningRef.current) {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      }
    } catch (err) {
      console.warn('MediaSession metadata error:', err);
    }
  }, [currentAyahIndex, isPlaying, reciter, viewMode, currentSurah, currentJuz]);

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

    if (mode === 'range' || mode === 'ruku') {
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

  // Preload upcoming Ayah into the browser cache so track change is instantaneous (0ms network delay)
  const preloadNextAyah = useCallback((currentIndex) => {
    const nextIdx = computeNextAyahIndex(currentIndex);
    if (nextIdx === null) return;

    const list = stateRef.current.ayahs;
    if (!list || !list[nextIdx]) return;

    const nextAyah = list[nextIdx];
    const nextUrl = getAyahAudioUrl(nextAyah, stateRef.current.reciter);

    if (nextUrl) {
      try {
        fetch(nextUrl, { mode: 'cors' }).catch(() => {});
      } catch {}
    }
  }, [computeNextAyahIndex]);

  // Load and play audio on the single persistent audio element
  const loadAndPlayAyah = useCallback(async (index, speed = null) => {
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

    const audio = audioRef.current;
    if (!audio) return;

    isTransitioningRef.current = true;

    // Start silent audio anchor in background if not already playing
    if (silentAudioRef.current && silentAudioRef.current.paused) {
      silentAudioRef.current.play().catch(() => {});
    }

    const requestId = ++playRequestIdRef.current;

    // Check if offline cached audio is available in Cache API
    let offlineBlobUrl = null;
    try {
      offlineBlobUrl = await getOfflineAudioBlob(url);
    } catch (e) {
      console.warn('Failed to retrieve offline audio blob:', e);
    }

    // If another playback request was initiated while waiting for cache, discard
    if (requestId !== playRequestIdRef.current) return;

    const playSource = offlineBlobUrl || url;

    // If replaying the exact same ayah audio URL (e.g. repetition mode)
    if (currentPlayingUrlRef.current === url && audio.src && !audio.error) {
      audio.currentTime = 0;
      audio.playbackRate = rate;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            isTransitioningRef.current = false;
          })
          .catch(err => {
            isTransitioningRef.current = false;
            if (err.name !== 'AbortError') {
              console.warn('Playback error:', err);
              setIsPlaying(false);
            }
          });
      } else {
        isTransitioningRef.current = false;
      }
    } else {
      // Clean up previous blob URL to prevent memory leaks
      if (currentBlobUrlRef.current && currentBlobUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
      }
      currentBlobUrlRef.current = offlineBlobUrl;
      currentPlayingUrlRef.current = url;

      audio.src = playSource;
      audio.playbackRate = rate;
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            isTransitioningRef.current = false;
          })
          .catch(err => {
            isTransitioningRef.current = false;
            if (err.name !== 'AbortError') {
              console.warn('Playback error:', err);
              setIsPlaying(false);
            }
          });
      } else {
        isTransitioningRef.current = false;
      }
    }

    // Immediately prefetch the next upcoming verse in background
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
        if (silentAudioRef.current) silentAudioRef.current.pause();
      }
      return;
    }

    // Ayah Repetition Mode
    if (mode === 'ayah') {
      const isInfinite = target === 'infinity';
      if (isInfinite || cycle < target) {
        setCurrentCycle(prev => prev + 1);
        const audio = audioRef.current;
        if (audio) {
          audio.currentTime = 0;
          audio.play().catch(console.warn);
        }
      } else {
        setIsPlaying(false);
        setPlaybackMode('normal');
        if (silentAudioRef.current) silentAudioRef.current.pause();
      }
      return;
    }

    // Range & Ruku Repetition Mode
    if (mode === 'range' || mode === 'ruku') {
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
        // Reached end of the set range! Loop back to startIndex
        const isInfinite = target === 'infinity';
        if (isInfinite || cycle < target) {
          setCurrentCycle(prev => prev + 1);
          loadAndPlayAyah(startIndex);
        } else {
          setIsPlaying(false);
          if (silentAudioRef.current) silentAudioRef.current.pause();
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
          if (silentAudioRef.current) silentAudioRef.current.pause();
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
          if (silentAudioRef.current) silentAudioRef.current.pause();
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
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      if (silentAudioRef.current) silentAudioRef.current.pause();
    } else {
      if (silentAudioRef.current && silentAudioRef.current.paused) {
        silentAudioRef.current.play().catch(() => {});
      }
      if (!audio.src || audio.src === window.location.href) {
        loadAndPlayAyah(currentAyahIndex);
      } else {
        audio.play().catch(err => {
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

  // Stop completely and reset repetition state
  const stopPlayback = useCallback(() => {
    isTransitioningRef.current = false;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    if (silentAudioRef.current) {
      silentAudioRef.current.pause();
      silentAudioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setIsBuffering(false);
    setPlaybackMode('normal');
    setCurrentCycle(1);
    setAudioProgress({ currentTime: 0, duration: 0 });
  }, []);

  // Clear / Cancel Range Repetition
  const clearRangeRepetition = useCallback(() => {
    setPlaybackMode('normal');
    setRepeatTarget(1);
    setCurrentCycle(1);
    setRangeStart(null);
    setRangeEnd(null);
    setRangeSurahNumber(null);
    stopPlayback();
  }, [stopPlayback]);

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

  // 7. Repeat Current Ruku (detects Ruku boundary containing target verse and repeats target times)
  const repeatRuku = useCallback((targetIndex = null, count = 'infinity') => {
    const list = stateRef.current.ayahs;
    if (!list || list.length === 0) return;

    const idx = (targetIndex !== null && targetIndex >= 0 && targetIndex < list.length)
      ? targetIndex
      : stateRef.current.currentAyahIndex;
    const currentAyah = list[idx] || list[0];
    if (!currentAyah || currentAyah.ruku === undefined) return;

    const targetRuku = currentAyah.ruku;
    const firstRukuAyah = list.find(a => a.ruku === targetRuku);
    const lastRukuAyah = [...list].reverse().find(a => a.ruku === targetRuku);

    if (!firstRukuAyah || !lastRukuAyah) return;

    const startIndex = list.indexOf(firstRukuAyah);
    const endIndex = list.indexOf(lastRukuAyah);

    const startNum = firstRukuAyah.numberInSurah;
    const endNum = lastRukuAyah.numberInSurah;
    const surahNum = firstRukuAyah.surahNumber;

    setRangeSurahNumber(surahNum);
    setRangeStart(startNum);
    setRangeEnd(endNum);
    setRangeRepeatCount(count);
    setPlaybackMode('ruku');
    setRepeatTarget(count);
    setCurrentCycle(1);

    loadAndPlayAyah(startIndex);
  }, [loadAndPlayAyah]);

  // 8. Next Ayah
  const nextAyah = useCallback(() => {
    const { ayahs: list, currentAyahIndex: idx, playbackMode: mode, rangeEnd: rEnd } = stateRef.current;
    if (!list || list.length === 0) return;

    if (mode === 'range' || mode === 'ruku') {
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
    const audio = audioRef.current;

    if (audio && audio.currentTime > 2) {
      audio.currentTime = 0;
      return;
    }

    if (mode === 'range' || mode === 'ruku') {
      const minIndex = Math.max(0, rStart - 1);
      if (idx > minIndex) {
        loadAndPlayAyah(idx - 1);
      } else {
        if (audio) audio.currentTime = 0;
      }
    } else {
      if (idx > 0) {
        loadAndPlayAyah(idx - 1);
      } else {
        if (audio) audio.currentTime = 0;
      }
    }
  }, [loadAndPlayAyah]);

  // 10. Change Playback Speed (immediate effect)
  const changePlaybackSpeed = useCallback((speed) => {
    if (!PLAYBACK_SPEEDS.includes(speed)) return;
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, []);

  // 11. Change Reciter (preserves current position and continues smoothly if playing)
  const changeReciter = useCallback((newReciter) => {
    setReciter(newReciter);
    const audio = audioRef.current;
    const { ayahs: list, currentAyahIndex: idx } = stateRef.current;

    if (audio && list && list[idx]) {
      const wasPlaying = !audio.paused;
      const curTime = audio.currentTime;
      const newUrl = getAyahAudioUrl(list[idx], newReciter);

      audio.src = newUrl;
      audio.playbackRate = stateRef.current.playbackSpeed;
      audio.currentTime = curTime;

      if (wasPlaying) {
        audio.play().catch(console.warn);
      }

      // Preload next with new reciter
      preloadNextAyah(idx);
    }
  }, [preloadNextAyah]);

  // 12. Seek audio within active Ayah
  const seekAudio = useCallback((time) => {
    const audio = audioRef.current;
    if (audio && Number.isFinite(time)) {
      audio.currentTime = time;
    }
  }, []);

  // 13. Seek across overall Surah or Juz (jumps to target Ayah index and sets offset)
  const seekToAyah = useCallback((index, fraction = 0) => {
    const list = stateRef.current.ayahs;
    if (!list || list.length === 0) return;
    const targetIdx = Math.min(Math.max(0, index), list.length - 1);

    if (targetIdx === stateRef.current.currentAyahIndex) {
      // Seeking within currently playing Ayah
      const audio = audioRef.current;
      if (audio && audio.duration && Number.isFinite(fraction)) {
        audio.currentTime = Math.max(0, Math.min(audio.duration, fraction * audio.duration));
      }
    } else {
      // Jump to target Ayah in Surah or Juz and play
      loadAndPlayAyah(targetIdx);
      if (fraction > 0) {
        const audio = audioRef.current;
        if (audio && audio.duration && Number.isFinite(fraction)) {
          audio.currentTime = Math.max(0, Math.min(audio.duration, fraction * audio.duration));
        }
      }
    }
  }, [loadAndPlayAyah]);

  // Set up MediaSession Action Handlers for Mobile Lock Screen & Headphone Controls
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        const audio = audioRef.current;
        if (audio && audio.paused) {
          if (silentAudioRef.current && silentAudioRef.current.paused) {
            silentAudioRef.current.play().catch(() => {});
          }
          audio.play().catch(console.warn);
          setIsPlaying(true);
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        const audio = audioRef.current;
        if (audio && !audio.paused) {
          audio.pause();
          if (silentAudioRef.current) silentAudioRef.current.pause();
          setIsPlaying(false);
        }
      });

      navigator.mediaSession.setActionHandler('stop', () => {
        stopPlayback();
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        prevAyah();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        nextAyah();
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          seekAudio(details.seekTime);
        }
      });
    } catch (err) {
      console.warn('MediaSession handler warning:', err);
    }
  }, [prevAyah, nextAyah, seekAudio, stopPlayback]);

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
    repeatRuku,
    stopPlayback,
    clearRangeRepetition,
    nextAyah,
    prevAyah,
    changePlaybackSpeed,
    changeReciter,
    seekAudio,
    seekToAyah
  };
}
