import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Flame, Volume2, Play, Pause, Bookmark, Layers, BookOpen } from 'lucide-react';
import { fetchMushafPage, getMushafPageForSurah, getMushafPageForJuz } from '../services/quranApi';
import { getWeakSpotsMap } from '../services/weakSpotsStorage';
import { SURAHS, INDOPAK_JUZ_METADATA } from '../data/quranMeta';

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
    if (pageNumber < 604) onPageChange(pageNumber + 1);
  };

  const handlePageInputSubmit = (e) => {
    e.preventDefault();
    const p = parseInt(inputPage, 10);
    if (!isNaN(p) && p >= 1 && p <= 604) {
      onPageChange(p);
    } else {
      setInputPage(pageNumber.toString());
    }
  };

  const getWeakSpotForVerse = (surahNumber, numberInSurah) => {
    const id = `${surahNumber}:${numberInSurah}`;
    return weakSpotsMap[id] || null;
  };

  const getLineMistakesInfo = (words = []) => {
    let hasMemoryGap = false;
    let hasWordSlip = false;
    const weakVerses = new Set();

    (words || []).forEach(w => {
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
    <div className="mushaf-view-container" style={{ maxWidth: '840px', margin: '0 auto', padding: '0.5rem 0.5rem 2rem 0.5rem' }}>
      {/* Top Pagination & Quick Navigation Toolbar */}
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
        {/* Prev / Next Page Buttons & Page Direct Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            className="action-btn"
            onClick={handlePrevPage}
            disabled={pageNumber <= 1}
            title="Previous Page (Taj Company 16-Line)"
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
              max="604"
              value={inputPage}
              onChange={e => setInputPage(e.target.value)}
              style={{
                width: '56px',
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
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ 604</span>
          </form>

          <button
            className="action-btn"
            onClick={handleNextPage}
            disabled={pageNumber >= 604}
            title="Next Page (Taj Company 16-Line)"
            id="btn-mushaf-next-page"
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
              value={pageData?.primaryJuz || 1}
              onChange={e => {
                const jNum = parseInt(e.target.value, 10);
                const p = getMushafPageForJuz(jNum);
                onPageChange(p);
              }}
              style={{ fontSize: '0.8rem', padding: '0.25rem 0.4rem', borderRadius: 'var(--radius-md)' }}
              id="select-mushaf-juz"
              title="Jump to 16-Line Mushaf starting page for selected Juz/Para"
            >
              {(INDOPAK_JUZ_METADATA || []).map(j => (
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
                const p = getMushafPageForSurah(sNum);
                onPageChange(p);
              }}
              style={{ fontSize: '0.8rem', padding: '0.25rem 0.4rem', borderRadius: 'var(--radius-md)' }}
              id="select-mushaf-surah"
              title="Jump to 16-Line Mushaf starting page for selected Surah"
            >
              {SURAHS.map(s => (
                <option key={s.number} value={s.number}>
                  {s.number}. {s.englishName} ({s.name})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Scanned Taj Company 16-Line Page Display with Line Highlight Overlay */}
      <div
        className="taj-mushaf-scanned-container"
        style={{
          position: 'relative',
          background: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.2)',
          border: '2px solid #000000',
          overflow: 'hidden'
        }}
        id={`taj-scanned-page-container-${pageNumber}`}
      >
        {/* Scanned Taj Company Printed Page Image */}
        <img
          src={`/mushaf_pages/page_${pageNumber}.webp`}
          alt={`Taj Company 16-Line Mushaf Page ${pageNumber}`}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}
          onError={(e) => {
            // Fallback to PNG if webp hasn't finished extracting
            e.target.onerror = null;
            e.target.src = `/mushaf_pages/page_${pageNumber}.png`;
          }}
        />

        {/* Interactive 16-Line Grid Overlay */}
        {pageData && pageData.lines && (
          <div
            className="taj-lines-overlay-grid"
            style={{
              position: 'absolute',
              top: '8.2%',
              bottom: '5.2%',
              left: '4%',
              right: '4%',
              display: 'flex',
              flexDirection: 'column',
              pointerEvents: 'none'
            }}
          >
            {pageData.lines.map((lineObj) => {
              const lineMistakeInfo = getLineMistakesInfo(lineObj.words);
              const isLineActivePlaying = currentAyah && lineObj.words.some(w => w.surahNumber === currentAyah.surahNumber && w.numberInSurah === currentAyah.numberInSurah);
              const firstWord = lineObj.words && lineObj.words[0];

              return (
                <div
                  key={lineObj.lineNumber}
                  className={`line-overlay-row ${lineMistakeInfo.hasMistake ? 'has-mistake' : ''} ${isLineActivePlaying ? 'is-playing' : ''}`}
                  onClick={() => {
                    if (firstWord && onPlayAyah) {
                      onPlayAyah({
                        surahNumber: firstWord.surahNumber,
                        numberInSurah: firstWord.numberInSurah
                      });
                    }
                  }}
                  title={firstWord ? `Line ${lineObj.lineNumber} • Surah ${firstWord.surahNumber} Ayah ${firstWord.numberInSurah} (Click to recite)` : `Line ${lineObj.lineNumber}`}
                  style={{
                    flex: 1,
                    pointerEvents: 'auto',
                    cursor: firstWord ? 'pointer' : 'default',
                    position: 'relative',
                    background: lineMistakeInfo.hasMistake
                      ? 'rgba(239, 68, 68, 0.28)'
                      : isLineActivePlaying
                      ? 'rgba(16, 185, 129, 0.24)'
                      : 'transparent',
                    borderTop: lineMistakeInfo.hasMistake
                      ? '2px solid #ef4444'
                      : isLineActivePlaying
                      ? '2px solid #10b981'
                      : '1px solid transparent',
                    borderBottom: lineMistakeInfo.hasMistake
                      ? '2px solid #ef4444'
                      : isLineActivePlaying
                      ? '2px solid #10b981'
                      : '1px solid transparent',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* Line Overlay Cell */}
                  {/* Line Mistake Badge Overlay */}
                  {lineMistakeInfo.hasMistake && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '4px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        color: '#ffffff',
                        background: '#ef4444',
                        padding: '0.12rem 0.45rem',
                        borderRadius: '10px',
                        direction: 'ltr',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                        zIndex: 10
                      }}
                    >
                      <Flame size={10} color="#fff" />
                      <span>Line {lineObj.lineNumber} Mistake ({lineMistakeInfo.count})</span>
                    </div>
                  )}

                  {/* Line Audio Playing Badge Overlay */}
                  {isLineActivePlaying && !lineMistakeInfo.hasMistake && (
                    <div
                      style={{
                        position: 'absolute',
                        right: '4px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        color: '#ffffff',
                        background: '#10b981',
                        padding: '0.12rem 0.45rem',
                        borderRadius: '10px',
                        direction: 'ltr',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                        zIndex: 10
                      }}
                    >
                      <Volume2 size={10} color="#fff" />
                      <span>Reciting</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          paddingTop: '0.75rem',
          marginTop: '0.5rem',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          fontWeight: 600
        }}
      >
        <button className="action-btn" onClick={handlePrevPage} disabled={pageNumber <= 1}>
          <ChevronLeft size={15} />
          <span>Page {pageNumber - 1}</span>
        </button>

        <div>
          Taj Company 16-Line • Page {pageNumber} of 604
        </div>

        <button className="action-btn" onClick={handleNextPage} disabled={pageNumber >= 604}>
          <span>Page {pageNumber + 1}</span>
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
