import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, Flame, BookOpen, Search, RotateCcw, Volume2 } from 'lucide-react';
import { fetchMushafPage } from '../services/quranApi';
import { getWeakSpotsMap } from '../services/weakSpotsStorage';
import { SURAHS } from '../data/quranMeta';

export function MushafView({
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

  // Listen for weak spot storage updates
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

    fetchMushafPage(pageNumber)
      .then(data => {
        if (isMounted) {
          setPageData(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err.message || 'Failed to load Mushaf page');
          setLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, [pageNumber]);

  const handlePrevPage = () => {
    if (pageNumber > 1) onPageChange(pageNumber - 1);
  };

  const handleNextPage = () => {
    if (pageNumber < 548) onPageChange(pageNumber + 1);
  };

  const handlePageInputSubmit = (e) => {
    e.preventDefault();
    const p = parseInt(inputPage, 10);
    if (!isNaN(p) && p >= 1 && p <= 548) {
      onPageChange(p);
    } else {
      setInputPage(pageNumber.toString());
    }
  };

  // Helper to check if a specific verse key has a weak spot
  const getWeakSpotForVerse = (surahNumber, numberInSurah) => {
    const id = `${surahNumber}:${numberInSurah}`;
    return weakSpotsMap[id] || null;
  };

  // Helper to calculate total mistakes on a line
  const getLineMistakesInfo = (words = []) => {
    let hasMemoryGap = false;
    let hasWordSlip = false;
    const weakVerses = new Set();

    words.forEach(w => {
      const item = getWeakSpotForVerse(w.surahNumber, w.numberInSurah);
      if (item) {
        weakVerses.add(item.id);
        if (item.mistakeType === 'memory_gap') {
          hasMemoryGap = true;
        } else {
          hasWordSlip = true;
        }
      }
    });

    return {
      hasMistake: weakVerses.size > 0,
      hasMemoryGap,
      hasWordSlip,
      count: weakVerses.size
    };
  };

  return (
    <div className="mushaf-view-container" style={{ maxWidth: '820px', margin: '0 auto', padding: '0.5rem 0.5rem 2rem 0.5rem' }}>
      {/* Top Pagination & Navigation Toolbar */}
      <div
        className="mushaf-toolbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          gap: '0.5rem',
          padding: '0.6rem 0.85rem',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '1rem',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            className="action-btn"
            onClick={handlePrevPage}
            disabled={pageNumber <= 1}
            title="Previous Page (16-Line Mushaf)"
            id="btn-mushaf-prev-page"
          >
            <ChevronLeft size={16} />
            <span>Prev Page</span>
          </button>

          <form onSubmit={handlePageInputSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Page</span>
            <input
              type="number"
              min="1"
              max="548"
              value={inputPage}
              onChange={e => setInputPage(e.target.value)}
              style={{
                width: '54px',
                textAlign: 'center',
                padding: '0.2rem 0.35rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-subtle)',
                color: 'var(--text-main)',
                fontWeight: 600
              }}
              id="input-mushaf-page-number"
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ 548</span>
          </form>

          <button
            className="action-btn"
            onClick={handleNextPage}
            disabled={pageNumber >= 548}
            title="Next Page (16-Line Mushaf)"
            id="btn-mushaf-next-page"
          >
            <span>Next Page</span>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Quick Surah jump selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <select
            className="surah-select"
            value={pageData?.primarySurah?.number || 1}
            onChange={e => {
              const sNum = parseInt(e.target.value, 10);
              const meta = SURAHS.find(s => s.number === sNum);
              if (meta && meta.mushafPage) {
                onPageChange(meta.mushafPage);
              }
            }}
            style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-md)' }}
            id="select-mushaf-surah"
          >
            {SURAHS.map(s => (
              <option key={s.number} value={s.number}>
                Surah {s.number}. {s.englishName} ({s.name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main 16-Line Indo-Pak Mushaf Frame */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
          <div>Loading 16-Line Indo-Pak Mushaf Page {pageNumber}...</div>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--danger)' }}>
          <div>Failed to load Mushaf page: {error}</div>
          <button className="action-btn primary" onClick={() => onPageChange(pageNumber)} style={{ marginTop: '1rem' }}>
            Retry Loading
          </button>
        </div>
      ) : (
        <div
          className="mushaf-page-card"
          style={{
            background: 'var(--bg-surface)',
            border: '2px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-xl)',
            padding: '1.25rem 1rem',
            position: 'relative',
            direction: 'rtl'
          }}
          id={`mushaf-page-card-${pageNumber}`}
        >
          {/* Authentic Mushaf Page Header Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
              borderBottom: '2px double var(--border-subtle)',
              paddingBottom: '0.6rem',
              marginBottom: '0.85rem',
              direction: 'ltr',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: 'var(--primary-dark)'
            }}
          >
            <div>
              {pageData.primarySurah ? `Surah ${pageData.primarySurah.number}. ${pageData.primarySurah.englishName} (${pageData.primarySurah.name})` : ''}
            </div>
            <div
              style={{
                background: 'var(--primary-light)',
                color: 'var(--primary-dark)',
                padding: '0.15rem 0.6rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.78rem'
              }}
            >
              16-Line Mushaf • Page {pageNumber}
            </div>
            <div>
              Juz {pageData.primaryJuz}
            </div>
          </div>

          {/* 16 Lines Renderer */}
          <div className="mushaf-16-lines-grid" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {pageData.lines.map((lineObj) => {
              const lineMistakeInfo = getLineMistakesInfo(lineObj.words);
              const isLineActivePlaying = currentAyah && lineObj.words.some(w => w.surahNumber === currentAyah.surahNumber && w.numberInSurah === currentAyah.numberInSurah);

              return (
                <div
                  key={lineObj.lineNumber}
                  className={`mushaf-line-row ${lineMistakeInfo.hasMistake ? 'line-has-mistake' : ''} ${isLineActivePlaying ? 'line-playing' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    minHeight: '44px',
                    padding: '0.3rem 0.5rem',
                    borderRadius: 'var(--radius-md)',
                    background: lineMistakeInfo.hasMistake
                      ? 'rgba(239, 68, 68, 0.12)'
                      : isLineActivePlaying
                      ? 'rgba(16, 185, 129, 0.14)'
                      : 'transparent',
                    borderLeft: lineMistakeInfo.hasMistake
                      ? '4px solid #ef4444'
                      : isLineActivePlaying
                      ? '4px solid var(--primary)'
                      : '4px solid transparent',
                    borderRight: lineMistakeInfo.hasMistake
                      ? '4px solid #ef4444'
                      : isLineActivePlaying
                      ? '4px solid var(--primary)'
                      : '4px solid transparent',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  id={`mushaf-line-${pageNumber}-${lineObj.lineNumber}`}
                >
                  {/* Line Number Badge (Right margin LTR view) */}
                  <div
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: lineMistakeInfo.hasMistake ? '#ef4444' : 'var(--text-subtle)',
                      direction: 'ltr',
                      minWidth: '24px',
                      userSelect: 'none'
                    }}
                  >
                    L{lineObj.lineNumber}
                  </div>

                  {/* Line Text Render (Right to Left Indo-Pak Arabic) */}
                  <div
                    className="arabic-quran-text"
                    style={{
                      flex: 1,
                      textAlign: 'justify',
                      textJustify: 'inter-word',
                      direction: 'rtl',
                      fontSize: '1.42rem',
                      lineHeight: 1.85,
                      letterSpacing: '0px',
                      color: 'var(--text-main)',
                      padding: '0 0.5rem'
                    }}
                  >
                    {lineObj.words.map((word, wIdx) => {
                      const ayahItem = getWeakSpotForVerse(word.surahNumber, word.numberInSurah);
                      const isWordHighlighted = ayahItem && Array.isArray(ayahItem.highlightedWords) && ayahItem.highlightedWords.includes(wIdx);
                      const isAyahWeak = Boolean(ayahItem);

                      return (
                        <span
                          key={word.id || wIdx}
                          onClick={() => {
                            if (onPlayAyah) {
                              onPlayAyah({
                                surahNumber: word.surahNumber,
                                numberInSurah: word.numberInSurah
                              });
                            }
                          }}
                          title={`Click to recite Surah ${word.surahNumber} Ayah ${word.numberInSurah}`}
                          style={{
                            cursor: 'pointer',
                            display: 'inline-block',
                            padding: '0 0.1rem',
                            borderRadius: 'var(--radius-sm)',
                            background: isWordHighlighted
                              ? 'rgba(239, 68, 68, 0.35)'
                              : isAyahWeak
                              ? 'rgba(239, 68, 68, 0.18)'
                              : 'transparent',
                            color: isWordHighlighted ? '#ef4444' : 'inherit',
                            fontWeight: isWordHighlighted ? 700 : 'normal',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {word.textIndopak}{' '}
                        </span>
                      );
                    })}
                  </div>

                  {/* Line Mistake Indicator Tag */}
                  {lineMistakeInfo.hasMistake && (
                    <div
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: '#ef4444',
                        background: 'rgba(239, 68, 68, 0.18)',
                        padding: '0.1rem 0.4rem',
                        borderRadius: 'var(--radius-full)',
                        direction: 'ltr',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        whiteSpace: 'nowrap'
                      }}
                      title="This Mushaf line contains an Ayah marked with a mistake/weak spot"
                    >
                      <Flame size={10} color="#ef4444" />
                      <span>Line Mistake</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Authentic Page Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
              borderTop: '2px double var(--border-subtle)',
              paddingTop: '0.6rem',
              marginTop: '0.85rem',
              direction: 'ltr',
              fontSize: '0.78rem',
              color: 'var(--text-muted)'
            }}
          >
            <button className="action-btn" onClick={handlePrevPage} disabled={pageNumber <= 1}>
              <ChevronLeft size={14} />
              <span>Page {pageNumber - 1}</span>
            </button>

            <div style={{ fontWeight: 600 }}>
              Page {pageNumber} of 548 (16-Line Indo-Pak)
            </div>

            <button className="action-btn" onClick={handleNextPage} disabled={pageNumber >= 548}>
              <span>Page {pageNumber + 1}</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
