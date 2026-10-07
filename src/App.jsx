import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { SurahModal } from './components/SurahModal';
import { JuzModal } from './components/JuzModal';
import { ReciterModal } from './components/ReciterModal';
import { RepetitionToolbar } from './components/RepetitionToolbar';
import { AyahCard } from './components/AyahCard';
import { PlayerBar } from './components/PlayerBar';
import { GoToAyahModal } from './components/GoToAyahModal';
import { OfflineModal } from './components/OfflineModal';
import { WeakSpotsModal } from './components/WeakSpotsModal';
import { fetchSurah, fetchJuz, getMushafPageForAyah } from './services/quranApi';
import { MushafView } from './components/MushafView';
import { Mushaf7View } from './components/Mushaf7View';
import { getMushaf7PageForAyah, MUSHAF_7_TOTAL_PAGES, MUSHAF_7_AVAILABLE_PAGES } from './services/mushaf7Service';
import { SURAHS, INDOPAK_JUZ_METADATA, MADANI_JUZ_METADATA } from './data/quranMeta';
import { useQuranAudio } from './hooks/useQuranAudio';
import { isItemDownloaded } from './services/offlineStorage';
import {
  getWeakSpotsCount,
  getWeakSpotsCountForScope,
  isWeakSpot,
  getWeakSpotItem,
  markMistake,
  removeWeakSpot,
  toggleWordHighlight
} from './services/weakSpotsStorage';
import { AlertCircle, RefreshCw, Loader2, Target, CheckCircle2, DownloadCloud, Flame } from 'lucide-react';

// Parse initial navigation from URL hash or localStorage so reloads preserve current Surah/Juz/Mushaf
function getInitialNavigationState() {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash || '';
    const m7Match = hash.match(/^#mushaf7=(\d+)/i);
    if (m7Match) {
      const num = parseInt(m7Match[1], 10);
      return { viewMode: 'mushaf7', surahNumber: 1, juzNumber: 1, mushaf7Page: num, tajPage: 1 };
    }

    const tajMatch = hash.match(/^#(taj|mushaf|page)=(\d+)/i);
    if (tajMatch) {
      const num = parseInt(tajMatch[2], 10);
      return { viewMode: 'taj', surahNumber: 1, juzNumber: 1, mushaf7Page: 1, tajPage: num };
    }

    const surahMatch = hash.match(/^#surah=(\d+)/i);
    if (surahMatch) {
      const num = parseInt(surahMatch[1], 10);
      if (num >= 1 && num <= 114) {
        return { viewMode: 'surah', surahNumber: num, juzNumber: 1, mushaf7Page: 1, tajPage: 1 };
      }
    }

    const juzMatch = hash.match(/^#juz=(\d+)/i);
    if (juzMatch) {
      const num = parseInt(juzMatch[1], 10);
      if (num >= 1 && num <= 30) {
        return { viewMode: 'juz', surahNumber: 1, juzNumber: num, mushaf7Page: 1, tajPage: 1 };
      }
    }

    const savedMode = localStorage.getItem('quran_view_mode');
    const savedSurah = parseInt(localStorage.getItem('quran_last_surah') || '1', 10);
    const validSurah = savedSurah >= 1 && savedSurah <= 114 ? savedSurah : 1;
    const savedJuz = parseInt(localStorage.getItem('quran_last_juz') || '1', 10);
    const validJuz = savedJuz >= 1 && savedJuz <= 30 ? savedJuz : 1;
    const savedM7Page = parseInt(localStorage.getItem('quran_mushaf7_page') || '1', 10);
    const savedTajPage = parseInt(localStorage.getItem('quran_taj_page') || '1', 10);

    if (savedMode === 'mushaf7') {
      return { viewMode: 'mushaf7', surahNumber: validSurah, juzNumber: validJuz, mushaf7Page: savedM7Page, tajPage: savedTajPage };
    }
    if (savedMode === 'taj' || savedMode === 'mushaf') {
      return { viewMode: 'taj', surahNumber: validSurah, juzNumber: validJuz, mushaf7Page: savedM7Page, tajPage: savedTajPage };
    }
    if (savedMode === 'juz') {
      return { viewMode: 'juz', surahNumber: validSurah, juzNumber: validJuz, mushaf7Page: savedM7Page, tajPage: savedTajPage };
    }
    return { viewMode: 'surah', surahNumber: validSurah, juzNumber: validJuz, mushaf7Page: savedM7Page, tajPage: savedTajPage };
  }
  return { viewMode: 'surah', surahNumber: 1, juzNumber: 1, mushaf7Page: 1, tajPage: 1 };
}

export function App() {
  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('quran_theme') || 'system';
  });

  // Auto-scroll follow state (stored in localStorage)
  const [autoScroll, setAutoScroll] = useState(() => {
    return localStorage.getItem('quran_autoscroll') !== 'false';
  });
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const userScrollTimerRef = useRef(null);

  // Navigation state (restored from URL hash or localStorage so reload stays on current Surah/Juz/Mushaf)
  const [initialNav] = useState(getInitialNavigationState);
  const [viewMode, setViewMode] = useState(initialNav.viewMode); // 'surah' | 'juz' | 'mushaf7' | 'taj'
  const [currentSurahNumber, setCurrentSurahNumber] = useState(initialNav.surahNumber);
  const [currentJuzNumber, setCurrentJuzNumber] = useState(initialNav.juzNumber);
  const [mushaf7PageNumber, setMushaf7PageNumber] = useState(initialNav.mushaf7Page || 1);
  const [tajPageNumber, setTajPageNumber] = useState(initialNav.tajPage || 1);

  // Juz division convention: 'indopak' (subcontinent) vs 'madani' (Uthmani)
  const [juzConvention, setJuzConvention] = useState(() => {
    return localStorage.getItem('quran_juz_convention') || 'indopak';
  });

  // Content state
  const [currentSurahMeta, setCurrentSurahMeta] = useState(() => {
    return SURAHS.find(s => s.number === initialNav.surahNumber) || SURAHS[0];
  });
  const [ayahs, setAyahs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  // Translation visibility toggle
  const [showTranslation, setShowTranslation] = useState(() => {
    return localStorage.getItem('quran_show_trans') !== 'false';
  });

  // Go to Ayah state
  const [highlightedAyahNumber, setHighlightedAyahNumber] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Modal open states
  const [isSurahModalOpen, setIsSurahModalOpen] = useState(false);
  const [isJuzModalOpen, setIsJuzModalOpen] = useState(false);
  const [isReciterModalOpen, setIsReciterModalOpen] = useState(false);
  const [isGoToAyahModalOpen, setIsGoToAyahModalOpen] = useState(false);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const [isWeakSpotsModalOpen, setIsWeakSpotsModalOpen] = useState(false);
  const [isCurrentOffline, setIsCurrentOffline] = useState(false);

  // Weak Spots state & pending triplet revision ref
  const [weakSpotsCount, setWeakSpotsCount] = useState(() => getWeakSpotsCount());
  const [weakSpotsVersion, setWeakSpotsVersion] = useState(0);
  const pendingTripletRef = useRef(null);

  // Audio Hook
  const {
    isPlaying,
    isBuffering,
    currentAyahIndex,
    currentAyah,
    playbackSpeed,
    reciter,
    audioProgress,
    errorMessage: audioError,
    playbackMode,
    repeatTarget,
    currentCycle,
    rangeSurahNumber,
    setRangeSurahNumber,
    rangeStart,
    rangeEnd,
    rangeRepeatCount,
    setRangeStart,
    setRangeEnd,
    surahRepeatCount,
    juzRepeatCount,
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
  } = useQuranAudio({
    ayahs,
    viewMode,
    currentSurah: currentSurahMeta,
    currentJuz: currentJuzNumber
  });

  // Sync offline status for current view
  useEffect(() => {
    const updateOfflineStatus = () => {
      const type = viewMode === 'juz' ? 'juz' : 'surah';
      const id = viewMode === 'juz' ? currentJuzNumber : currentSurahNumber;
      setIsCurrentOffline(isItemDownloaded(type, id, reciter?.id));
    };
    updateOfflineStatus();

    window.addEventListener('quran-offline-index-updated', updateOfflineStatus);
    return () => window.removeEventListener('quran-offline-index-updated', updateOfflineStatus);
  }, [viewMode, currentSurahNumber, currentJuzNumber, reciter?.id]);

  // Sync Weak Spots count and version
  useEffect(() => {
    const updateWeakSpotsState = () => {
      setWeakSpotsCount(getWeakSpotsCount());
      setWeakSpotsVersion(v => v + 1);
    };
    window.addEventListener('quran-weak-spots-updated', updateWeakSpotsState);
    return () => window.removeEventListener('quran-weak-spots-updated', updateWeakSpotsState);
  }, []);

  // Weak Spots count in active scope (Surah or Juz)
  const weakSpotsScopeCount = useMemo(() => {
    return getWeakSpotsCountForScope(viewMode, currentSurahNumber, currentJuzNumber);
  }, [viewMode, currentSurahNumber, currentJuzNumber, weakSpotsVersion]);

  // Scroll to top whenever Surah, Juz, or View Mode changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [currentSurahNumber, currentJuzNumber, viewMode, juzConvention]);

  // Compute metadata of the Surah actively selected for range repetition
  const rangeSurahMeta = useMemo(() => {
    if (viewMode === 'surah') return currentSurahMeta;
    if (rangeSurahNumber) {
      return SURAHS.find(s => s.number === rangeSurahNumber) || currentSurahMeta;
    }
    return currentSurahMeta;
  }, [viewMode, rangeSurahNumber, currentSurahMeta]);

  // Apply Theme
  useEffect(() => {
    localStorage.setItem('quran_theme', theme);
    const root = document.documentElement;

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);

  // Save Translation preference
  useEffect(() => {
    localStorage.setItem('quran_show_trans', showTranslation.toString());
  }, [showTranslation]);

  // Show temporary toast message
  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev);
    }, 3000);
  }, []);

  // Mark mistake on an Ayah with mistake type ('memory_gap' or 'word_highlight')
  const handleMarkMistake = useCallback((ayahToMark, mistakeType = 'memory_gap') => {
    if (!ayahToMark) return;
    const updated = markMistake(ayahToMark, currentSurahMeta, mistakeType);
    setWeakSpotsVersion(v => v + 1);
    setWeakSpotsCount(getWeakSpotsCount());
    if (updated) {
      if (mistakeType === 'word_highlight') {
        showToast(`Marked Word Slip for Ayah ${updated.numberInSurah}. Tap words to highlight exact spot!`);
      } else {
        showToast(`Marked Memory Gap for Surah ${updated.surahEnglishName} Ayah ${updated.numberInSurah}`);
      }
    }
  }, [currentSurahMeta, showToast]);

  // Remove weak spot from storage
  const handleRemoveWeakSpot = useCallback((ayahToRemove) => {
    if (!ayahToRemove) return;
    removeWeakSpot(ayahToRemove.surahNumber, ayahToRemove.numberInSurah);
    setWeakSpotsVersion(v => v + 1);
    setWeakSpotsCount(getWeakSpotsCount());
    showToast(`Removed Ayah ${ayahToRemove.numberInSurah} from weak spots`);
  }, [showToast]);

  // Toggle word highlight on Ayah text
  const handleToggleWordHighlight = useCallback((ayahToHighlight, wordIdx) => {
    if (!ayahToHighlight) return;
    toggleWordHighlight(ayahToHighlight.surahNumber, ayahToHighlight.numberInSurah, wordIdx, ayahToHighlight, currentSurahMeta);
    setWeakSpotsVersion(v => v + 1);
    setWeakSpotsCount(getWeakSpotsCount());
  }, [currentSurahMeta]);

  // Start targeted triplet revision session (Prev -> Weak -> Next)
  const handleReviseTriplet = useCallback((spot) => {
    if (!spot) return;
    const surahMeta = SURAHS.find(s => s.number === spot.surahNumber);
    const totalAyahs = surahMeta ? surahMeta.numberOfAyahs : 286;
    const startNum = Math.max(1, spot.numberInSurah - 1);
    const endNum = Math.min(totalAyahs, spot.numberInSurah + 1);

    if (viewMode === 'surah' && currentSurahNumber === spot.surahNumber && ayahs.length > 0) {
      startRangeRepetition(startNum, endNum, 'infinity', spot.surahNumber);
      showToast(`Revising Triplet: Surah ${spot.surahEnglishName} Ayahs ${startNum}–${endNum}`);
      setTimeout(() => {
        const el = document.getElementById(`ayah-${spot.numberInSurah}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 250);
    } else {
      pendingTripletRef.current = {
        surahNumber: spot.surahNumber,
        startNum,
        endNum,
        targetAyahNum: spot.numberInSurah,
        surahName: spot.surahEnglishName
      };
      setViewMode('surah');
      setCurrentSurahNumber(spot.surahNumber);
    }
  }, [viewMode, currentSurahNumber, ayahs, startRangeRepetition, showToast]);

  // Jump to weak spot in main view
  const handleJumpToWeakSpot = useCallback((spot) => {
    if (!spot) return;
    if (viewMode === 'mushaf7') {
      const page = getMushaf7PageForAyah(spot.surahNumber, spot.numberInSurah);
      if (page) {
        setMushaf7PageNumber(page);
        showToast(`Jumped to Mushaf 7 Page ${page}`);
      }
      return;
    }
    if (viewMode === 'taj') {
      const page = getMushafPageForAyah(spot.surahNumber, spot.numberInSurah);
      if (page) {
        setTajPageNumber(page);
        showToast(`Jumped to Taj Mushaf Page ${page}`);
      }
      return;
    }
    if (viewMode === 'surah' && currentSurahNumber === spot.surahNumber) {
      setHighlightedAyahNumber(spot.numberInSurah);
      const el = document.getElementById(`ayah-${spot.numberInSurah}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setHighlightedAyahNumber(spot.numberInSurah);
      setViewMode('surah');
      setCurrentSurahNumber(spot.surahNumber);
    }
  }, [viewMode, currentSurahNumber, showToast]);

  // Handle playing an Ayah clicked inside either 16-line Mushaf view
  const handlePlayMushafAyah = useCallback(async (targetAyah) => {
    if (!targetAyah) return;
    const sNum = targetAyah.surahNumber;
    const aNum = targetAyah.numberInSurah;

    if (currentSurahNumber === sNum && ayahs.length > 0) {
      const idx = ayahs.findIndex(a => a.numberInSurah === aNum);
      if (idx !== -1) {
        playAyah(idx);
        return;
      }
    }

    try {
      const data = await fetchSurah(sNum);
      setAyahs(data.ayahs);
      setCurrentSurahNumber(sNum);
      setCurrentSurahMeta(data.surah);
      const idx = data.ayahs.findIndex(a => a.numberInSurah === aNum);
      if (idx !== -1) {
        setTimeout(() => {
          playAyah(idx);
        }, 50);
      }
    } catch (err) {
      console.error('Failed to load ayah audio:', err);
      showToast('Unable to load audio recitation for this verse.');
    }
  }, [currentSurahNumber, ayahs, playAyah, showToast]);

  // Execute pending triplet revision when content finishes loading
  useEffect(() => {
    if (!isLoading && ayahs.length > 0 && pendingTripletRef.current) {
      const { surahNumber, startNum, endNum, targetAyahNum, surahName } = pendingTripletRef.current;
      if (viewMode === 'surah' && currentSurahNumber === surahNumber) {
        pendingTripletRef.current = null;
        setTimeout(() => {
          startRangeRepetition(startNum, endNum, 'infinity', surahNumber);
          showToast(`Revising Triplet: Surah ${surahName} Ayahs ${startNum}–${endNum}`);
          setTimeout(() => {
            const el = document.getElementById(`ayah-${targetAyahNum}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
        }, 150);
      }
    }
  }, [isLoading, ayahs, viewMode, currentSurahNumber, startRangeRepetition, showToast]);

  // Load Content (Surah or Juz)
  const loadContent = useCallback(async () => {
    if (viewMode === 'mushaf7' || viewMode === 'taj') {
      if (ayahs.length === 0) {
        try {
          const data = await fetchSurah(currentSurahNumber || 1);
          setAyahs(data.ayahs);
          setCurrentSurahMeta(data.surah);
        } catch (e) {
          console.warn('Initial surah preload for Mushaf mode skipped:', e);
        }
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setApiError(null);

    try {
      if (viewMode === 'surah') {
        const data = await fetchSurah(currentSurahNumber);
        setAyahs(data.ayahs);
        setCurrentSurahMeta(data.surah);
        localStorage.setItem('quran_last_surah', currentSurahNumber.toString());
      } else {
        const data = await fetchJuz(currentJuzNumber, juzConvention);
        setAyahs(data.ayahs);
        localStorage.setItem('quran_last_juz', currentJuzNumber.toString());
      }
    } catch (err) {
      console.error('Failed to load Quran data:', err);
      setApiError('Unable to load recitation data from Al Quran Cloud. Please check your internet connection.');
    } finally {
      setIsLoading(false);
    }
  }, [viewMode, currentSurahNumber, currentJuzNumber, juzConvention, ayahs.length]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  // Keep localStorage and URL hash synced whenever viewMode, Surah, Juz, or Mushaf page changes
  useEffect(() => {
    localStorage.setItem('quran_view_mode', viewMode);
    if (viewMode === 'mushaf7') {
      localStorage.setItem('quran_mushaf7_page', mushaf7PageNumber.toString());
      const targetHash = `#mushaf7=${mushaf7PageNumber}`;
      if (window.location.hash !== targetHash) {
        window.history.replaceState(null, '', targetHash);
      }
    } else if (viewMode === 'taj') {
      localStorage.setItem('quran_taj_page', tajPageNumber.toString());
      const targetHash = `#taj=${tajPageNumber}`;
      if (window.location.hash !== targetHash) {
        window.history.replaceState(null, '', targetHash);
      }
    } else if (viewMode === 'surah') {
      localStorage.setItem('quran_last_surah', currentSurahNumber.toString());
      const targetHash = `#surah=${currentSurahNumber}`;
      if (window.location.hash !== targetHash) {
        window.history.replaceState(null, '', targetHash);
      }
    } else {
      localStorage.setItem('quran_last_juz', currentJuzNumber.toString());
      const targetHash = `#juz=${currentJuzNumber}`;
      if (window.location.hash !== targetHash) {
        window.history.replaceState(null, '', targetHash);
      }
    }
  }, [viewMode, currentSurahNumber, currentJuzNumber, mushaf7PageNumber, tajPageNumber]);

  // Support browser Back/Forward navigation with hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || '';
      const m7Match = hash.match(/^#mushaf7=(\d+)/i);
      if (m7Match) {
        const num = parseInt(m7Match[1], 10);
        setViewMode('mushaf7');
        setMushaf7PageNumber(num);
        return;
      }
      const tajMatch = hash.match(/^#(taj|mushaf|page)=(\d+)/i);
      if (tajMatch) {
        const num = parseInt(tajMatch[2], 10);
        setViewMode('taj');
        setTajPageNumber(num);
        return;
      }
      const surahMatch = hash.match(/^#surah=(\d+)/i);
      if (surahMatch) {
        const num = parseInt(surahMatch[1], 10);
        if (num >= 1 && num <= 114) {
          setViewMode('surah');
          setCurrentSurahNumber(num);
          const meta = SURAHS.find(s => s.number === num);
          if (meta) setCurrentSurahMeta(meta);
        }
        return;
      }
      const juzMatch = hash.match(/^#juz=(\d+)/i);
      if (juzMatch) {
        const num = parseInt(juzMatch[1], 10);
        if (num >= 1 && num <= 30) {
          setViewMode('juz');
          setCurrentJuzNumber(num);
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Detect when user is actively scrolling or reading (mouse wheel, touch swipe)
  useEffect(() => {
    const handleUserScroll = () => {
      setIsUserScrolling(true);
      if (userScrollTimerRef.current) {
        clearTimeout(userScrollTimerRef.current);
      }
      // When user is scrolling, do NOT yank screen to next Ayah!
      // Keep auto-scroll paused for 10 seconds after user stops scrolling
      userScrollTimerRef.current = setTimeout(() => {
        setIsUserScrolling(false);
      }, 10000);
    };

    window.addEventListener('wheel', handleUserScroll, { passive: true });
    window.addEventListener('touchmove', handleUserScroll, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleUserScroll);
      window.removeEventListener('touchmove', handleUserScroll);
      if (userScrollTimerRef.current) clearTimeout(userScrollTimerRef.current);
    };
  }, []);

  const handleToggleAutoScroll = () => {
    setAutoScroll(prev => {
      const next = !prev;
      localStorage.setItem('quran_autoscroll', next.toString());
      showToast(next ? 'Auto-scroll Follow Enabled' : 'Auto-scroll Follow Disabled');
      return next;
    });
  };

  // Auto-scroll to currently playing Ayah
  useEffect(() => {
    // If auto-scroll is disabled or user is currently scrolling, DO NOT navigate!
    if (!autoScroll || isUserScrolling) return;

    if (isPlaying && currentAyah?.number) {
      const el = document.getElementById(`ayah-${currentAyah.number}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        const isInViewport = rect.top >= 80 && rect.bottom <= (window.innerHeight - 150);
        if (!isInViewport) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [isPlaying, currentAyah?.number, autoScroll, isUserScrolling]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        nextAyah();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        prevAyah();
      } else if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        setIsGoToAyahModalOpen(true);
      } else if (e.code === 'Escape') {
        setIsSurahModalOpen(false);
        setIsJuzModalOpen(false);
        setIsReciterModalOpen(false);
        setIsGoToAyahModalOpen(false);
        stopPlayback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayPause, nextAyah, prevAyah, stopPlayback]);

  // Surah Selection Handler (navigates to top immediately)
  const handleSelectSurah = (surahNum) => {
    stopPlayback();
    setViewMode('surah');
    setCurrentSurahNumber(surahNum);
    localStorage.setItem('quran_view_mode', 'surah');
    localStorage.setItem('quran_last_surah', surahNum.toString());
    window.history.replaceState(null, '', `#surah=${surahNum}`);
    const meta = SURAHS.find(s => s.number === surahNum);
    if (meta) setCurrentSurahMeta(meta);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  // Juz Selection Handler (navigates to top immediately)
  const handleSelectJuz = (juzNum) => {
    stopPlayback();
    setViewMode('juz');
    setCurrentJuzNumber(juzNum);
    localStorage.setItem('quran_view_mode', 'juz');
    localStorage.setItem('quran_last_juz', juzNum.toString());
    window.history.replaceState(null, '', `#juz=${juzNum}`);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  // Juz Convention Handler
  const handleChangeJuzConvention = (convention) => {
    setJuzConvention(convention);
    localStorage.setItem('quran_juz_convention', convention);
    showToast(`Switched to ${convention === 'indopak' ? 'Indo-Pak' : 'Madani'} Juz Standard`);
  };

  // Jump to targeted Ayah object
  const handleJumpToTarget = useCallback((target) => {
    if (!target) return;
    const el = document.getElementById(`ayah-${target.number}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedAyahNumber(target.number);
      const label = `${target.surahEnglishName || 'Surah'} Ayah ${target.numberInSurah}`;
      showToast(`Pointed to ${label}`);
      setTimeout(() => {
        setHighlightedAyahNumber(null);
      }, 2500);
    }
  }, [showToast]);

  // Set Range Start Handler
  const handleSetRangeStart = useCallback((ayah) => {
    if (viewMode === 'juz') {
      setRangeSurahNumber(ayah.surahNumber);
    } else {
      setRangeSurahNumber(currentSurahNumber);
    }
    setRangeStart(ayah.numberInSurah);
    setRangeEnd(null);
    showToast(`Set Ayah ${ayah.numberInSurah} as Start. Click 'Set End' on a later verse to start loop.`);
  }, [viewMode, currentSurahNumber, setRangeSurahNumber, setRangeStart, setRangeEnd, showToast]);

  // Set Range End Handler (strictly checks that End > Start, then loops infinitely)
  const handleSetRangeEnd = useCallback((ayah) => {
    if (rangeStart === null || rangeStart === undefined) {
      showToast("Please click 'Set Start' on an earlier verse first.");
      return;
    }

    let isStrictlyAfter = false;
    if (viewMode === 'surah') {
      isStrictlyAfter = ayah.numberInSurah > rangeStart;
    } else {
      const targetSurahNum = rangeSurahNumber || ayahs[0]?.surahNumber;
      const startIdx = ayahs.findIndex(a =>
        (!targetSurahNum || a.surahNumber === targetSurahNum) &&
        a.numberInSurah === rangeStart
      );
      const endIdx = ayahs.findIndex(a => a.number === ayah.number);
      isStrictlyAfter = startIdx !== -1 && endIdx > startIdx;
    }

    if (!isStrictlyAfter) {
      showToast(`End verse must be strictly after Start verse (Ayah ${rangeStart}).`);
      return;
    }

    setRangeEnd(ayah.numberInSurah);
    const targetSurah = viewMode === 'juz' ? ayah.surahNumber : currentSurahNumber;
    if (viewMode === 'juz') {
      setRangeSurahNumber(ayah.surahNumber);
    }

    // Immediately start repeating from Start to End infinitely
    startRangeRepetition(rangeStart, ayah.numberInSurah, 'infinity', targetSurah);
    showToast(`Repeating Ayahs ${rangeStart}–${ayah.numberInSurah} infinitely! Click '✕' on any verse to stop.`);
  }, [rangeStart, viewMode, currentSurahNumber, rangeSurahNumber, ayahs, setRangeEnd, setRangeSurahNumber, startRangeRepetition, showToast]);

  // Cancel / Clear Range Loop Handler
  const handleClearRange = useCallback(() => {
    clearRangeRepetition();
    showToast("Range loop cancelled.");
  }, [clearRangeRepetition, showToast]);

  // Get current Juz metadata
  const currentJuzMeta = juzConvention === 'indopak'
    ? INDOPAK_JUZ_METADATA.find(j => j.id === currentJuzNumber)
    : MADANI_JUZ_METADATA.find(j => j.id === currentJuzNumber);

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notice" id="app-toast-notice">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={16} color="var(--primary)" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Top Header with persistent Go to Ayah trigger */}
      <Header
        viewMode={viewMode}
        currentSurah={currentSurahMeta}
        currentJuz={currentJuzNumber}
        reciter={reciter}
        theme={theme}
        setTheme={setTheme}
        showTranslation={showTranslation}
        setShowTranslation={setShowTranslation}
        onOpenSurahModal={() => setIsSurahModalOpen(true)}
        onOpenJuzModal={() => setIsJuzModalOpen(true)}
        onOpenReciterModal={() => setIsReciterModalOpen(true)}
        onOpenGoToAyahModal={() => setIsGoToAyahModalOpen(true)}
        onOpenOfflineModal={() => setIsOfflineModalOpen(true)}
        onOpenWeakSpotsModal={() => setIsWeakSpotsModalOpen(true)}
        weakSpotsCount={weakSpotsCount}
        weakSpotsScopeCount={weakSpotsScopeCount}
        onSelectMushaf7={() => {
          setViewMode('mushaf7');
          showToast('Switched to Quran Foundation 16-Line Mushaf');
        }}
        onSelectTaj={() => {
          setViewMode('taj');
          showToast('Switched to Taj Company 16-Line Mushaf');
        }}
        autoScroll={autoScroll}
        onToggleAutoScroll={handleToggleAutoScroll}
        onShowToast={showToast}
      />

      {/* Main Body Content */}
      <main className="main-content">
        {viewMode === 'mushaf7' ? (
          <Mushaf7View
            pageNumber={mushaf7PageNumber}
            onPageChange={(newPage) => {
              const p = Math.max(1, Math.min(MUSHAF_7_TOTAL_PAGES, newPage));
              setMushaf7PageNumber(p);
              localStorage.setItem('quran_mushaf7_page', p.toString());
              window.history.replaceState(null, '', `#mushaf7=${p}`);
              window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            }}
            currentAyah={currentAyah}
            isPlaying={isPlaying}
            onPlayAyah={handlePlayMushafAyah}
            onPauseAudio={togglePlayPause}
            onMarkMistake={handleMarkMistake}
            onOpenWeakSpotsModal={() => setIsWeakSpotsModalOpen(true)}
          />
        ) : viewMode === 'taj' ? (
          <MushafView
            pageNumber={tajPageNumber}
            onPageChange={(newPage) => {
              const p = Math.max(1, Math.min(548, newPage));
              setTajPageNumber(p);
              localStorage.setItem('quran_taj_page', p.toString());
              window.history.replaceState(null, '', `#taj=${p}`);
              window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            }}
            currentAyah={currentAyah}
            isPlaying={isPlaying}
            onPlayAyah={handlePlayMushafAyah}
            onPauseAudio={togglePlayPause}
            onMarkMistake={handleMarkMistake}
            onOpenWeakSpotsModal={() => setIsWeakSpotsModalOpen(true)}
          />
        ) : (
          <>
            {/* API Error Alert */}
            {apiError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--danger-light)',
              color: 'var(--danger)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              border: '1px solid var(--danger)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertCircle size={20} />
              <span>{apiError}</span>
            </div>
            <button className="action-btn" onClick={loadContent}>
              <RefreshCw size={14} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Surah / Juz Banner Title */}
        <section className="surah-banner">
          {viewMode === 'surah' ? (
            <>
              <div className="surah-title-arabic">{currentSurahMeta?.name}</div>
              <div className="surah-title-english">
                {currentSurahMeta?.number}. {currentSurahMeta?.englishName} ({currentSurahMeta?.englishNameTranslation})
              </div>
              <div className="surah-meta-tags">
                <span className="meta-pill">{currentSurahMeta?.revelationType}</span>
                <span className="meta-pill">{ayahs.length} Ayahs</span>
                <span className="meta-pill">Reciter: {reciter?.name}</span>
                <button
                  className="meta-pill"
                  onClick={() => setIsOfflineModalOpen(true)}
                  title={isCurrentOffline ? "Downloaded for offline playback" : "Click to download for offline"}
                  style={{
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: isCurrentOffline ? 'var(--primary-light)' : 'var(--bg-surface)',
                    color: isCurrentOffline ? 'var(--primary)' : 'var(--text-muted)',
                    borderColor: isCurrentOffline ? 'var(--primary)' : 'var(--border-subtle)',
                    fontWeight: 600
                  }}
                >
                  {isCurrentOffline ? <CheckCircle2 size={13} color="var(--primary)" /> : <DownloadCloud size={13} />}
                  <span>{isCurrentOffline ? 'Ready Offline' : 'Download for Offline'}</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="surah-title-arabic">{currentJuzMeta ? currentJuzMeta.name : `الجزء ${currentJuzNumber}`}</div>
              <div className="surah-title-english">
                Juz {currentJuzNumber} • {currentJuzMeta?.transliteration || ''}
              </div>
              <div className="surah-meta-tags">
                <span className="meta-pill">{ayahs.length} Ayahs</span>
                <span className="meta-pill">
                  {juzConvention === 'indopak' ? 'Indo-Pak Subcontinent Standard' : 'Madani Standard'}
                </span>
                <span className="meta-pill">Reciter: {reciter?.name}</span>
                <button
                  className="meta-pill"
                  onClick={() => setIsOfflineModalOpen(true)}
                  title={isCurrentOffline ? "Downloaded for offline playback" : "Click to download for offline"}
                  style={{
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: isCurrentOffline ? 'var(--primary-light)' : 'var(--bg-surface)',
                    color: isCurrentOffline ? 'var(--primary)' : 'var(--text-muted)',
                    borderColor: isCurrentOffline ? 'var(--primary)' : 'var(--border-subtle)',
                    fontWeight: 600
                  }}
                >
                  {isCurrentOffline ? <CheckCircle2 size={13} color="var(--primary)" /> : <DownloadCloud size={13} />}
                  <span>{isCurrentOffline ? 'Ready Offline' : 'Download for Offline'}</span>
                </button>
              </div>
            </>
          )}

          {/* Ornamental Bismillah (Except for Surah 9 At-Tawbah) */}
          {(viewMode === 'juz' || currentSurahNumber !== 9) && (
            <div className="bismillah-decoration">
              بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
            </div>
          )}
        </section>

        {/* Repetition and Range Control Toolbar */}
        {!isLoading && ayahs.length > 0 && (
          <RepetitionToolbar
            viewMode={viewMode}
            ayahs={ayahs}
            ayahsCount={ayahs.length}
            currentSurah={currentSurahMeta}
            currentJuz={currentJuzNumber}
            rangeSurahNumber={rangeSurahNumber}
            onRangeSurahChange={setRangeSurahNumber}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            rangeRepeatCount={rangeRepeatCount}
            onRangeStartChange={setRangeStart}
            onRangeEndChange={setRangeEnd}
            onStartRangeRepetition={startRangeRepetition}
            playbackMode={playbackMode}
            repeatTarget={repeatTarget}
            currentCycle={currentCycle}
            currentAyah={currentAyah}
            isPlaying={isPlaying}
            onStopPlayback={stopPlayback}
            onRepeatSurah={repeatSurah}
            onRepeatJuz={repeatJuz}
            onRepeatRuku={repeatRuku}
            surahRepeatCount={surahRepeatCount}
            juzRepeatCount={juzRepeatCount}
            onOpenWeakSpotsModal={() => setIsWeakSpotsModalOpen(true)}
            weakSpotsCount={weakSpotsCount}
            weakSpotsScopeCount={weakSpotsScopeCount}
          />
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
            <Loader2 size={36} className="spin-animation" style={{ margin: '0 auto 1rem' }} />
            <div>Loading Quran recitation and verses...</div>
          </div>
        )}

        {/* Ayahs List */}
        {!isLoading && ayahs.length > 0 && (
          <div className="ayah-list">
            {ayahs.map((ayah, idx) => {
              const isCurrent = currentAyahIndex === idx;
              const isHighlighted = ayah.number === highlightedAyahNumber;

              // Accurate range highlight computation (only when a range is set)
              let isStart = false;
              let isEnd = false;
              let inRange = false;

              if (rangeStart !== null && rangeStart !== undefined) {
                const targetSurahNum = rangeSurahNumber || (viewMode === 'surah' ? currentSurahNumber : ayahs[0]?.surahNumber);
                const startIdx = ayahs.findIndex(a =>
                  (!targetSurahNum || a.surahNumber === targetSurahNum) &&
                  a.numberInSurah === rangeStart
                );

                if (startIdx !== -1) {
                  if (idx === startIdx) isStart = true;

                  if (rangeEnd !== null && rangeEnd !== undefined) {
                    const endIdx = ayahs.findIndex(a =>
                      (!targetSurahNum || a.surahNumber === targetSurahNum) &&
                      a.numberInSurah === rangeEnd
                    );

                    if (endIdx !== -1 && endIdx >= startIdx) {
                      if (idx === endIdx) isEnd = true;
                      if (idx >= startIdx && idx <= endIdx) inRange = true;
                    }
                  }
                }
              }

              const isRangeActive = rangeStart !== null || playbackMode === 'range' || playbackMode === 'ruku';

              // Check if a new Surah starts at this ayah in Juz view
              const isNewSurahInJuz = viewMode === 'juz' && idx > 0 && ayah.surahNumber !== ayahs[idx - 1].surahNumber;

              return (
                <React.Fragment key={ayah.number}>
                  {/* Surah divider banner when Juz transitions into a new Surah */}
                  {isNewSurahInJuz && (
                    <div
                      style={{
                        margin: '1.75rem 0 1rem',
                        padding: '1.5rem',
                        textAlign: 'center',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      <div style={{ fontFamily: 'var(--font-arabic)', fontSize: '2rem', color: 'var(--primary)' }}>
                        {ayah.surahName}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-main)', marginTop: '0.25rem' }}>
                        Surah {ayah.surahNumber}. {ayah.surahEnglishName}
                      </div>
                      {ayah.surahNumber !== 9 && (
                        <div className="bismillah-decoration" style={{ fontSize: '1.6rem', marginTop: '0.75rem', paddingTop: '0.75rem' }}>
                          بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                        </div>
                      )}
                    </div>
                  )}

                  <AyahCard
                    ayah={ayah}
                    index={idx}
                    viewMode={viewMode}
                    isCurrentAyah={isCurrent}
                    isHighlighted={isHighlighted}
                    isPlaying={isPlaying}
                    playbackMode={playbackMode}
                    repeatTarget={repeatTarget}
                    currentCycle={currentCycle}
                    isInRange={inRange}
                    isRangeStart={isStart}
                    isRangeEnd={isEnd}
                    isRangeActive={isRangeActive}
                    showTranslation={showTranslation}
                    onPlay={playAyah}
                    onPause={togglePlayPause}
                    onRepeatAyah={repeatSingleAyah}
                    onRepeatRuku={(targetIdx, count) => repeatRuku(targetIdx, count)}
                    onSetRangeStart={() => handleSetRangeStart(ayah)}
                    onSetRangeEnd={() => handleSetRangeEnd(ayah)}
                    onClearRange={handleClearRange}
                    onMarkMistake={handleMarkMistake}
                    onRemoveWeakSpot={handleRemoveWeakSpot}
                    onToggleWordHighlight={handleToggleWordHighlight}
                    isWeakSpot={isWeakSpot(ayah.surahNumber, ayah.numberInSurah)}
                    weakSpotItem={getWeakSpotItem(ayah.surahNumber, ayah.numberInSurah)}
                  />
                </React.Fragment>
              );
            })}
          </div>
        )}
        </>
        )}
      </main>

      {/* Centralized Fixed Bottom Player */}
      <PlayerBar
        currentAyah={currentAyah}
        currentAyahIndex={currentAyahIndex}
        totalAyahs={ayahs.length}
        currentSurah={currentSurahMeta}
        currentJuz={currentJuzNumber}
        viewMode={viewMode}
        isPlaying={isPlaying}
        isBuffering={isBuffering}
        playbackSpeed={playbackSpeed}
        reciter={reciter}
        audioProgress={audioProgress}
        playbackMode={playbackMode}
        repeatTarget={repeatTarget}
        currentCycle={currentCycle}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        rangeSurahName={rangeSurahMeta?.englishName}
        errorMessage={audioError}
        onTogglePlayPause={togglePlayPause}
        onStop={stopPlayback}
        onPrev={prevAyah}
        onNext={nextAyah}
        onChangeSpeed={changePlaybackSpeed}
        onSeek={seekAudio}
        onSeekOverall={seekToAyah}
        onOpenReciterModal={() => setIsReciterModalOpen(true)}
        onMarkMistake={handleMarkMistake}
        onRemoveWeakSpot={handleRemoveWeakSpot}
        isWeakSpot={currentAyah ? isWeakSpot(currentAyah.surahNumber, currentAyah.numberInSurah) : false}
        weakSpotItem={currentAyah ? getWeakSpotItem(currentAyah.surahNumber, currentAyah.numberInSurah) : null}
      />

      {/* Surah Selector Modal */}
      <SurahModal
        isOpen={isSurahModalOpen}
        onClose={() => setIsSurahModalOpen(false)}
        currentSurahNumber={currentSurahNumber}
        onSelectSurah={handleSelectSurah}
      />

      {/* Juz Selector Modal with Convention Picker */}
      <JuzModal
        isOpen={isJuzModalOpen}
        onClose={() => setIsJuzModalOpen(false)}
        currentJuzNumber={currentJuzNumber}
        onSelectJuz={handleSelectJuz}
        juzConvention={juzConvention}
        onChangeJuzConvention={handleChangeJuzConvention}
      />

      {/* Reciter Selector Modal */}
      <ReciterModal
        isOpen={isReciterModalOpen}
        onClose={() => setIsReciterModalOpen(false)}
        currentReciter={reciter}
        onSelectReciter={changeReciter}
      />

      {/* Go to Ayah Modal (with multi-Surah selection and search filter) */}
      <GoToAyahModal
        isOpen={isGoToAyahModalOpen}
        onClose={() => setIsGoToAyahModalOpen(false)}
        ayahs={ayahs}
        viewMode={viewMode}
        currentSurah={currentSurahMeta}
        currentJuz={currentJuzNumber}
        onJumpToTarget={handleJumpToTarget}
      />

      {/* Offline Recitation Downloads Manager Modal */}
      <OfflineModal
        isOpen={isOfflineModalOpen}
        onClose={() => setIsOfflineModalOpen(false)}
        viewMode={viewMode}
        currentSurah={currentSurahMeta}
        currentJuz={currentJuzNumber}
        juzConvention={juzConvention}
        reciter={reciter}
        onShowToast={showToast}
      />

      {/* Weak Spots & Mistake Tracking Revision Modal */}
      <WeakSpotsModal
        isOpen={isWeakSpotsModalOpen}
        onClose={() => setIsWeakSpotsModalOpen(false)}
        viewMode={viewMode}
        currentSurahNumber={currentSurahNumber}
        currentJuzNumber={currentJuzNumber}
        currentSurahMeta={currentSurahMeta}
        onReviseTriplet={handleReviseTriplet}
        onJumpToAyah={handleJumpToWeakSpot}
        onShowToast={showToast}
      />

      {/* Floating Snap to Playing Ayah button when user has scrolled away */}
      {isPlaying && (isUserScrolling || !autoScroll) && currentAyah && (
        <button
          className="floating-sync-btn"
          onClick={() => {
            setIsUserScrolling(false);
            const el = document.getElementById(`ayah-${currentAyah.number}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }}
          title="Scroll to currently playing verse"
        >
          <Target size={14} />
          <span>Snap to Playing Ayah ({currentAyah.numberInSurah})</span>
        </button>
      )}
    </div>
  );
}
export default App;
