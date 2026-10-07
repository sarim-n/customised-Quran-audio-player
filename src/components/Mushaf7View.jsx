import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, Flame, Volume2, BookOpen, Layers, Sparkles } from 'lucide-react';
import { fetchMushaf7Page, getMushaf7PageForSurah, getMushaf7PageForJuz, MUSHAF_7_TOTAL_PAGES, MUSHAF_7_AVAILABLE_PAGES } from '../services/mushaf7Service';
import { getWeakSpotsMap } from '../services/weakSpotsStorage';
import { SURAHS, INDOPAK_JUZ_METADATA } from '../data/quranMeta';

export function Mushaf7View({
  pageNumber = 1,
  onPageChange,
  currentAyah = null,
  isPlaying = false,
  onPlayAyah,
  onPauseAudio,
  onMarkMistake,
  onOpenWeakSpotsModal
}) {
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weakSpotsMap, setWeakSpotsMap] = useState({});
  const [inputPage, setInputPage] = useState(pageNumber.toString());
  const linesContainerRef = useRef(null);
  const lineRefs = useRef({});
  const lineScalesRef = useRef({});
  const [lineScales, setLineScales] = useState({});

  const refreshWeakSpots = () => {
    setWeakSpotsMap(getWeakSpotsMap());
  };

  useEffect(() => {
    refreshWeakSpots();
    window.addEventListener('quran-weak-spots-updated', refreshWeakSpots);
    return () => window.removeEventListener('quran-weak-spots-updated', refreshWeakSpots);
  }, []);

  useEffect(() => {
    setInputPage(pageNumber.toString());
    let isMounted = true;
    setLoading(true);
    setError(null);
    lineRefs.current = {};
    lineScalesRef.current = {};
    setLineScales({});

    fetchMushaf7Page(pageNumber)
      .then(data => {
        if (isMounted) {
          setPageData(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err.message || `Failed to load Mushaf 7 Page ${pageNumber}`);
          setLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, [pageNumber]);

  // Measure actual rendered physical line widths and calculate scaleX independently per line
  useEffect(() => {
    let isMounted = true;

    const measureAndScale = () => {
      if (!isMounted || !linesContainerRef.current) return;
      const container = linesContainerRef.current;
      const containerWidth = container.clientWidth || 0;
      if (containerWidth <= 0) return;

      // Usable line width inside physical line's horizontal padding (0.5rem = 8px left + 8px right)
      let horizontalPadding = 16;
      const firstLineEl = container.firstElementChild;
      if (firstLineEl && typeof window !== 'undefined') {
        const computed = window.getComputedStyle(firstLineEl);
        const pl = parseFloat(computed.paddingLeft) || 8;
        const pr = parseFloat(computed.paddingRight) || 8;
        horizontalPadding = pl + pr;
      }
      const targetWidth = Math.max(0, containerWidth - horizontalPadding);
      if (targetWidth <= 0) return;

      const MAX_SCALE_X = 1.15; // Conservative cap as specified (1.10 - 1.15)
      const newScales = {};

      for (const [lineNumStr, el] of Object.entries(lineRefs.current)) {
        const lineNum = Number(lineNumStr);
        if (el) {
          // Measure subpixel natural width from DOM getBoundingClientRect
          const currentScale = lineScalesRef.current[lineNum] || 1.0;
          const rect = el.getBoundingClientRect();
          const naturalWidth = rect.width > 0 ? (rect.width / currentScale) : (el.scrollWidth || el.offsetWidth || 0);

          if (naturalWidth > 0) {
            const requiredScale = targetWidth / naturalWidth;
            if (requiredScale >= 1.0) {
              newScales[lineNum] = Math.min(requiredScale, MAX_SCALE_X);
            } else {
              // Scale down on mobile if natural width exceeds target container width
              newScales[lineNum] = Math.max(requiredScale, 0.70);
            }
          }
        }
      }

      lineScalesRef.current = newScales;
      setLineScales(prev => {
        const keys = Object.keys(newScales);
        if (keys.length === 0) return prev;
        const hasChanged = keys.some(
          k => Math.abs((newScales[k] || 1) - (prev[k] || 1)) > 0.002
        );
        return hasChanged ? newScales : prev;
      });
    };

    // Immediate calculation if font already loaded/cached
    requestAnimationFrame(measureAndScale);

    // Wait for document.fonts.ready for fresh font loading
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (isMounted) {
          requestAnimationFrame(() => {
            if (isMounted) requestAnimationFrame(measureAndScale);
          });
        }
      });
    }

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined' && linesContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        measureAndScale();
      });
      resizeObserver.observe(linesContainerRef.current);
    }

    return () => {
      isMounted = false;
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [pageData]);

  const maxAllowedPage = MUSHAF_7_AVAILABLE_PAGES || 548;

  const handlePrevPage = () => {
    if (pageNumber > 1) onPageChange(pageNumber - 1);
  };

  const handleNextPage = () => {
    if (pageNumber < maxAllowedPage) onPageChange(pageNumber + 1);
  };

  const handlePageInputSubmit = (e) => {
    e.preventDefault();
    const p = parseInt(inputPage, 10);
    if (!isNaN(p) && p >= 1 && p <= maxAllowedPage) {
      onPageChange(p);
    } else {
      setInputPage(pageNumber.toString());
    }
  };

  const isVersePlaying = (surahNumber, numberInSurah) => {
    return isPlaying && currentAyah &&
      Number(currentAyah.surahNumber) === Number(surahNumber) &&
      Number(currentAyah.numberInSurah) === Number(numberInSurah);
  };

  const isVerseWeakSpot = (surahNumber, numberInSurah) => {
    const id = `${surahNumber}:${numberInSurah}`;
    return weakSpotsMap[id] || null;
  };

  // Convert English numerals to Eastern Arabic numerals for page numbers
  const toEasternArabic = (num) => {
    if (num === null || num === undefined) return '';
    const digits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return num.toString().split('').map(d => digits[parseInt(d, 10)] || d).join('');
  };

  return (
    <div className="mushaf7-viewer-wrapper" style={{ maxWidth: '680px', margin: '0 auto', padding: '0 0.5rem 3rem' }}>
      {/* Top Navigation & Selector Bar */}
      <div
        className="mushaf-nav-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '1rem',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        {/* Page Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="action-btn"
            onClick={handlePrevPage}
            disabled={pageNumber <= 1}
            title="Previous Page (IndoPak 16-Line)"
            id="btn-mushaf7-prev-page"
          >
            <ChevronLeft size={16} />
            <span>Prev Page</span>
          </button>

          <form onSubmit={handlePageInputSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Page</span>
            <input
              type="number"
              min="1"
              max={maxAllowedPage}
              value={inputPage}
              onChange={e => setInputPage(e.target.value)}
              style={{
                width: '60px',
                textAlign: 'center',
                padding: '0.3rem 0.4rem',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-subtle)',
                color: 'var(--text-main)',
                fontWeight: 600
              }}
              id="input-mushaf7-page-number"
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ {MUSHAF_7_TOTAL_PAGES}</span>
          </form>

          <button
            className="action-btn"
            onClick={handleNextPage}
            disabled={pageNumber >= maxAllowedPage}
            title="Next Page (IndoPak 16-Line)"
            id="btn-mushaf7-next-page"
          >
            <span>Next Page</span>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Quick Surah & Juz Navigation Dropdowns */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Juz / Para Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Juz:</span>
            <select
              className="surah-select"
              value={1}
              onChange={e => {
                const jNum = parseInt(e.target.value, 10);
                const p = getMushaf7PageForJuz(jNum);
                onPageChange(p);
              }}
              style={{ fontSize: '0.8rem', padding: '0.25rem 0.4rem', borderRadius: 'var(--radius-md)' }}
              id="select-mushaf7-juz"
              title="Jump to 16-Line Mushaf starting page for selected Juz/Para"
            >
              {(INDOPAK_JUZ_METADATA || []).slice(0, 3).map(j => (
                <option key={j.id} value={j.id}>
                  Juz {j.id} ({j.transliteration} - {j.name})
                </option>
              ))}
            </select>
          </div>

          {/* Surah Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Surah:</span>
            <select
              className="surah-select"
              value={pageData?.primarySurah?.number || 1}
              onChange={e => {
                const sNum = parseInt(e.target.value, 10);
                const p = getMushaf7PageForSurah(sNum);
                onPageChange(p);
              }}
              style={{ fontSize: '0.8rem', padding: '0.25rem 0.4rem', borderRadius: 'var(--radius-md)' }}
              id="select-mushaf7-surah"
              title="Jump to 16-Line Mushaf starting page for selected Surah"
            >
              {SURAHS.slice(0, 3).map(s => (
                <option key={s.number} value={s.number}>
                  {s.number}. {s.englishName} ({s.name})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontFamily: 'var(--font-indopak)' }}>
            جاري تحميل صفحة المصحف...
          </div>
          <div>Loading authentic 16-line IndoPak layout for Page {pageNumber}...</div>
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', background: 'var(--danger-light)', borderRadius: 'var(--radius-lg)', color: 'var(--danger)' }}>
          <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Unable to load page</div>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>{error}</p>
        </div>
      )}

      {/* Authentic IndoPak 16-Line Mushaf Page Container */}
      {!loading && !error && pageData && (
        <div
          className="mushaf7-page-card"
          style={{
            position: 'relative',
            background: 'var(--bg-surface)',
            border: '2px solid #b38b4d', // Ornamental Quranic gold outer border
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
            padding: 'var(--mushaf7-card-padding, 1.25rem 1.5rem 1.5rem)',
            margin: '0 auto',
            maxWidth: '680px',
            overflow: 'hidden'
          }}
          id={`mushaf7-page-${pageNumber}`}
        >
          {/* Inner Decorative Framing Border */}
          <div
            className="mushaf7-inner-frame"
            style={{
              border: '1px solid #d4af37',
              borderRadius: '8px',
              padding: 'var(--mushaf7-frame-padding, 0.85rem 1.25rem 1rem)',
              background: 'var(--bg-surface)',
              overflow: 'hidden'
            }}
          >
            {/* Page Header Bar (Surah Name / Page Number / Juz Name) */}
            <div
              className="mushaf7-header-bar"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '0.6rem',
                marginBottom: '0.75rem',
                borderBottom: '1px solid #d4af37',
                fontSize: '0.95rem',
                color: '#b38b4d',
                fontFamily: 'var(--font-arabic)',
                direction: 'rtl'
              }}
            >
              <div style={{ fontWeight: 'bold' }}>
                {pageData.primarySurah?.name || 'سورة'}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', fontFamily: 'var(--font-indopak)' }}>
                {toEasternArabic(pageNumber)}
              </div>
              <div style={{ fontWeight: 'bold' }}>
                {pageNumber === 1 ? 'الجزء الأول' : 'المصحف العثماني'}
              </div>
            </div>

            {/* Exactly 16 Physical Text Lines */}
            <div
              ref={linesContainerRef}
              className="mushaf7-lines-container"
              style={{
                display: 'flex',
                flexDirection: 'column',
                direction: 'rtl',
                gap: '0.45rem',
                userSelect: 'text'
              }}
            >
              {pageData.lines.map((lineObj) => {
                const words = lineObj.words || [];
                const lineHasPlayingWord = words.some(w => isVersePlaying(w.surahNumber, w.numberInSurah));
                const firstWord = words[0];
                const lineScale = lineScales[lineObj.lineNumber];

                return (
                  <div
                    key={`line-${lineObj.lineNumber}`}
                    className={`mushaf7-physical-line ${lineHasPlayingWord ? 'line-is-active' : ''}`}
                    style={{
                      direction: 'rtl',
                      textAlign: 'right',
                      width: '100%',
                      minHeight: 'var(--mushaf7-min-height, 2.55rem)',
                      lineHeight: 'var(--mushaf7-line-height, 2.4rem)',
                      padding: 'var(--mushaf7-line-padding, 0.1rem 0.5rem)',
                      borderRadius: '6px',
                      background: lineHasPlayingWord ? 'rgba(5, 150, 105, 0.12)' : 'transparent',
                      transition: 'background 0.2s ease',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    title={firstWord ? `Line ${lineObj.lineNumber} • Ayah ${firstWord.verseKey}` : `Line ${lineObj.lineNumber}`}
                  >
                    {/* Natural RTL text flow of words across the line with whole-line scaling */}
                    <div
                      ref={el => {
                        if (el) {
                          lineRefs.current[lineObj.lineNumber] = el;
                        }
                      }}
                      className="mushaf7-line-text"
                      style={{
                        display: 'inline-block',
                        whiteSpace: 'nowrap',
                        direction: 'rtl',
                        textAlign: 'right',
                        fontFamily: 'var(--font-indopak)',
                        fontSize: 'var(--mushaf7-font-size, 1.85rem)',
                        lineHeight: 'var(--mushaf7-line-height, 2.4rem)',
                        transformOrigin: 'right center',
                        transform: lineScale && Math.abs(lineScale - 1) > 0.005 ? `scaleX(${lineScale})` : undefined
                      }}
                    >
                      {words.map((w, wIdx) => {
                        const isEnd = w.charType === 'end';
                        const isPlayingAyah = isVersePlaying(w.surahNumber, w.numberInSurah);
                        const weakSpot = isVerseWeakSpot(w.surahNumber, w.numberInSurah);

                        if (isEnd) {
                          // Authentic Ayah End Marker
                          return (
                            <React.Fragment key={`word-${w.wordId || wIdx}`}>
                              {wIdx > 0 ? ' ' : null}
                              <span
                                className="mushaf7-ayah-marker"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onPlayAyah) {
                                    onPlayAyah({
                                      surahNumber: w.surahNumber,
                                      numberInSurah: w.numberInSurah
                                    });
                                  }
                                }}
                                title={`End of Ayah ${w.verseKey} (Click to recite)`}
                                style={{
                                  display: 'inline',
                                  color: isPlayingAyah ? 'var(--primary)' : '#b38b4d',
                                  cursor: 'pointer',
                                  fontSize: 'calc(var(--mushaf7-font-size, 1.85rem) * 0.95)',
                                  verticalAlign: 'middle',
                                  transition: 'transform 0.15s ease'
                                }}
                              >
                                {w.text}
                              </span>
                            </React.Fragment>
                          );
                        }

                        // Regular Quranic Word
                        return (
                          <React.Fragment key={`word-${w.wordId || wIdx}`}>
                            {wIdx > 0 ? ' ' : null}
                            <span
                              className={`mushaf7-word ${isPlayingAyah ? 'word-active' : ''} ${weakSpot ? 'word-weak-spot' : ''}`}
                              onClick={() => {
                                if (onPlayAyah) {
                                  onPlayAyah({
                                    surahNumber: w.surahNumber,
                                    numberInSurah: w.numberInSurah
                                  });
                                }
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                if (onMarkMistake) {
                                  onMarkMistake({
                                    surahNumber: w.surahNumber,
                                    numberInSurah: w.numberInSurah,
                                    surahEnglishName: pageData.primarySurah?.englishName || 'Surah'
                                  }, 'memory_gap');
                                }
                              }}
                              title={`Surah ${w.surahNumber} Ayah ${w.numberInSurah} (Click to play, right-click to mark mistake)`}
                              style={{
                                display: 'inline',
                                cursor: 'pointer',
                                color: isPlayingAyah
                                  ? 'var(--primary)'
                                  : weakSpot
                                  ? '#dc2626'
                                  : 'var(--text-main)',
                                textDecoration: weakSpot ? 'underline 2px #dc2626' : 'none',
                                borderRadius: '4px',
                                transition: 'color 0.15s ease, background 0.15s ease'
                              }}
                            >
                              {w.text}
                            </span>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Footer Details */}
            <div
              className="mushaf7-footer-bar"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '0.75rem',
                marginTop: '0.85rem',
                borderTop: '1px solid #d4af37',
                fontSize: '0.8rem',
                color: 'var(--text-muted)'
              }}
            >
              <div>
                <span>Verses: </span>
                <strong style={{ color: 'var(--text-main)' }}>
                  {pageData.firstVerseKey} – {pageData.lastVerseKey}
                </strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#b38b4d', fontWeight: 600 }}>
                <Sparkles size={14} />
                <span>IndoPak 16-Line Authentic Layout (Quran Foundation)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
