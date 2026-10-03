import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { SurahModal } from './components/SurahModal';
import { JuzModal } from './components/JuzModal';
import { ReciterModal } from './components/ReciterModal';
import { RepetitionToolbar } from './components/RepetitionToolbar';
import { AyahCard } from './components/AyahCard';
import { PlayerBar } from './components/PlayerBar';
import { GoToAyahModal } from './components/GoToAyahModal';
import { fetchSurah, fetchJuz } from './services/quranApi';
import { SURAHS, INDOPAK_JUZ_METADATA, MADANI_JUZ_METADATA } from './data/quranMeta';
import { useQuranAudio } from './hooks/useQuranAudio';
import { AlertCircle, RefreshCw, Loader2, Target, CheckCircle2 } from 'lucide-react';

// Parse initial navigation from URL hash or localStorage so reloads preserve current Surah/Juz
function getInitialNavigationState() {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash || '';
    const surahMatch = hash.match(/^#surah=(\d+)/i);
    if (surahMatch) {
      const num = parseInt(surahMatch[1], 10);
      if (num >= 1 && num <= 114) {
        return { viewMode: 'surah', surahNumber: num, juzNumber: 1 };
      }
    }

    const juzMatch = hash.match(/^#juz=(\d+)/i);
    if (juzMatch) {
      const num = parseInt(juzMatch[1], 10);
      if (num >= 1 && num <= 30) {
        return { viewMode: 'juz', surahNumber: 1, juzNumber: num };
      }
    }

    const savedMode = localStorage.getItem('quran_view_mode');
    const savedSurah = parseInt(localStorage.getItem('quran_last_surah') || '1', 10);
    const validSurah = savedSurah >= 1 && savedSurah <= 114 ? savedSurah : 1;
    const savedJuz = parseInt(localStorage.getItem('quran_last_juz') || '1', 10);
    const validJuz = savedJuz >= 1 && savedJuz <= 30 ? savedJuz : 1;

    if (savedMode === 'juz') {
      return { viewMode: 'juz', surahNumber: validSurah, juzNumber: validJuz };
    }
    return { viewMode: 'surah', surahNumber: validSurah, juzNumber: validJuz };
  }
  return { viewMode: 'surah', surahNumber: 1, juzNumber: 1 };
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

  // Navigation state (restored from URL hash or localStorage so reload stays on current Surah/Juz)
  const [initialNav] = useState(getInitialNavigationState);
  const [viewMode, setViewMode] = useState(initialNav.viewMode); // 'surah' | 'juz'
  const [currentSurahNumber, setCurrentSurahNumber] = useState(initialNav.surahNumber);
  const [currentJuzNumber, setCurrentJuzNumber] = useState(initialNav.juzNumber);

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
    stopPlayback,
    nextAyah,
    prevAyah,
    changePlaybackSpeed,
    changeReciter,
    seekAudio
  } = useQuranAudio({
    ayahs,
    viewMode,
    currentSurah: currentSurahMeta,
    currentJuz: currentJuzNumber
  });

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

  // Load Content (Surah or Juz)
  const loadContent = useCallback(async () => {
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
  }, [viewMode, currentSurahNumber, currentJuzNumber, juzConvention]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  // Keep localStorage and URL hash synced whenever viewMode, Surah, or Juz changes
  useEffect(() => {
    localStorage.setItem('quran_view_mode', viewMode);
    if (viewMode === 'surah') {
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
  }, [viewMode, currentSurahNumber, currentJuzNumber]);

  // Support browser Back/Forward navigation with hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || '';
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
        autoScroll={autoScroll}
        onToggleAutoScroll={handleToggleAutoScroll}
      />

      {/* Main Body Content */}
      <main className="main-content">
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
            surahRepeatCount={surahRepeatCount}
            juzRepeatCount={juzRepeatCount}
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

              // Find indices of rangeStart and rangeEnd for the designated Surah
              const targetSurahNum = rangeSurahNumber || (viewMode === 'surah' ? currentSurahNumber : ayahs[0]?.surahNumber);
              let startIdx = ayahs.findIndex(a =>
                (viewMode === 'juz' && targetSurahNum ? a.surahNumber === targetSurahNum : true) &&
                a.numberInSurah === rangeStart
              );
              let endIdx = ayahs.findIndex(a =>
                (viewMode === 'juz' && targetSurahNum ? a.surahNumber === targetSurahNum : true) &&
                a.numberInSurah === rangeEnd
              );
              if (startIdx === -1) startIdx = 0;
              if (endIdx === -1) endIdx = Math.min(ayahs.length - 1, 4);

              const normStartIdx = Math.min(startIdx, endIdx);
              const normEndIdx = Math.max(startIdx, endIdx);
              const inRange = idx >= normStartIdx && idx <= normEndIdx;
              const isStart = idx === normStartIdx;
              const isEnd = idx === normEndIdx;

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
                    showTranslation={showTranslation}
                    onPlay={playAyah}
                    onPause={togglePlayPause}
                    onRepeatAyah={repeatSingleAyah}
                    onSetRangeStart={() => {
                      if (viewMode === 'juz') setRangeSurahNumber(ayah.surahNumber);
                      setRangeStart(ayah.numberInSurah);
                      showToast(`Set ${ayah.surahEnglishName || 'Surah'} Ayah ${ayah.numberInSurah} as Range Start`);
                    }}
                    onSetRangeEnd={() => {
                      if (viewMode === 'juz') setRangeSurahNumber(ayah.surahNumber);
                      setRangeEnd(ayah.numberInSurah);
                      showToast(`Set ${ayah.surahEnglishName || 'Surah'} Ayah ${ayah.numberInSurah} as Range End`);
                    }}
                  />
                </React.Fragment>
              );
            })}
          </div>
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
        onOpenReciterModal={() => setIsReciterModalOpen(true)}
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
