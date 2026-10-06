import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Flame, Volume2 } from 'lucide-react';
import { fetchMushafPage } from '../services/quranApi';
import { getWeakSpotsMap } from '../services/weakSpotsStorage';
import { SURAHS } from '../data/quranMeta';

// Convert Western digits (123) to Eastern Arabic numerals (١٢٣)
function toArabicNumerals(num) {
  if (num === null || num === undefined) return '';
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().replace(/\d/g, d => arabicDigits[d]);
}

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

  const getWeakSpotForVerse = (surahNumber, numberInSurah) => {
    const id = `${surahNumber}:${numberInSurah}`;
    return weakSpotsMap[id] || null;
  };

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
    <div className="mushaf-view-container" style={{ maxWidth: '840px', margin: '0 auto', padding: '0.5rem 0.5rem 2rem 0.5rem' }}>
      {/* Top Pagination & Navigation Control Bar */}
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

      {/* Loading & Error States */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
          <div>Loading Taj Company 16-Line Mushaf Page {pageNumber}...</div>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--danger)' }}>
          <div>Failed to load Mushaf page: {error}</div>
          <button className="action-btn primary" onClick={() => onPageChange(pageNumber)} style={{ marginTop: '1rem' }}>
            Retry Loading
          </button>
        </div>
      ) : (
        /* Authentic Taj Company 16-Line Double Border Frame */
        <div
          className="taj-mushaf-frame"
          style={{
            background: '#ffffff',
            color: '#000000',
            border: '4px solid #000000',
            outline: '1px solid #000000',
            outlineOffset: '-6px',
            borderRadius: '4px',
            padding: '10px 8px',
            boxShadow: '0 10px 32px rgba(0, 0, 0, 0.15)',
            direction: 'rtl',
            position: 'relative'
          }}
          id={`taj-mushaf-frame-page-${pageNumber}`}
        >
          {/* Top 3-Column Header Row (Taj Company Print Style) */}
          <div
            className="taj-header-row"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 80px 1fr',
              alignItems: 'center',
              borderTop: '2px solid #000000',
              borderBottom: '2px solid #000000',
              marginBottom: '6px',
              padding: '3px 0',
              fontWeight: 700,
              fontSize: '1.15rem',
              color: '#000000'
            }}
          >
            {/* Right Cell: Surah Name */}
            <div style={{ textAlign: 'right', paddingRight: '8px', borderLeft: '1px solid #000000' }}>
              {pageData.primarySurah ? pageData.primarySurah.name : ''}
            </div>

            {/* Center Cell: Page Number in Eastern Arabic Numerals */}
            <div style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 800 }}>
              {toArabicNumerals(pageNumber)}
            </div>

            {/* Left Cell: Juz Name */}
            <div style={{ textAlign: 'left', paddingLeft: '8px', borderRight: '1px solid #000000' }}>
              {pageData.primaryJuz ? `الجزء ${toArabicNumerals(pageData.primaryJuz)}` : ''}
            </div>
          </div>

          {/* 16 Horizontal Boxed Grid Rows */}
          <div
            className="taj-16-lines-grid"
            style={{
              display: 'flex',
              flexDirection: 'column',
              borderTop: '1px solid #000000'
            }}
          >
            {pageData.lines.map((lineObj, idx) => {
              const lineMistakeInfo = getLineMistakesInfo(lineObj.words);
              const isLineActivePlaying = currentAyah && lineObj.words.some(w => w.surahNumber === currentAyah.surahNumber && w.numberInSurah === currentAyah.numberInSurah);
              const isLastLine = idx === pageData.lines.length - 1;

              return (
                <div
                  key={lineObj.lineNumber}
                  className={`taj-line-cell ${lineMistakeInfo.hasMistake ? 'line-has-mistake' : ''} ${isLineActivePlaying ? 'line-playing' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    minHeight: '44px',
                    padding: '0.15rem 0.5rem',
                    borderBottom: isLastLine ? '2px solid #000000' : '1px solid #000000',
                    background: lineMistakeInfo.hasMistake
                      ? 'rgba(239, 68, 68, 0.22)'
                      : isLineActivePlaying
                      ? 'rgba(16, 185, 129, 0.18)'
                      : 'transparent',
                    borderLeft: lineMistakeInfo.hasMistake
                      ? '5px solid #ef4444'
                      : isLineActivePlaying
                      ? '5px solid #10b981'
                      : 'none',
                    borderRight: lineMistakeInfo.hasMistake
                      ? '5px solid #ef4444'
                      : isLineActivePlaying
                      ? '5px solid #10b981'
                      : 'none',
                    transition: 'background 0.2s ease',
                    position: 'relative'
                  }}
                  id={`taj-line-${pageNumber}-${lineObj.lineNumber}`}
                >
                  {/* Line Calligraphy Words */}
                  <div
                    className="arabic-quran-text"
                    style={{
                      width: '100%',
                      textAlign: 'justify',
                      textJustify: 'inter-word',
                      textAlignLast: 'justify',
                      direction: 'rtl',
                      fontSize: '1.45rem',
                      lineHeight: 1.8,
                      letterSpacing: '0px',
                      color: '#000000',
                      fontWeight: 600
                    }}
                  >
                    {lineObj.words.map((word, wIdx) => {
                      const ayahItem = getWeakSpotForVerse(word.surahNumber, word.numberInSurah);
                      const isWordHighlighted = ayahItem && Array.isArray(ayahItem.highlightedWords) && ayahItem.highlightedWords.includes(wIdx);

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
                            borderRadius: '2px',
                            background: isWordHighlighted
                              ? 'rgba(239, 68, 68, 0.45)'
                              : 'transparent',
                            color: isWordHighlighted ? '#dc2626' : '#000000',
                            fontWeight: isWordHighlighted ? 800 : 'normal'
                          }}
                        >
                          {word.textIndopak}{' '}
                        </span>
                      );
                    })}
                  </div>

                  {/* Line Mistake Floating Tag */}
                  {lineMistakeInfo.hasMistake && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '6px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        color: '#ffffff',
                        background: '#ef4444',
                        padding: '0.1rem 0.45rem',
                        borderRadius: '10px',
                        direction: 'ltr',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}
                      title="Weak spot on this line"
                    >
                      <Flame size={10} color="#fff" />
                      <span>Line {lineObj.lineNumber}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Footer Navigation */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
              paddingTop: '0.6rem',
              marginTop: '0.4rem',
              direction: 'ltr',
              fontSize: '0.8rem',
              color: '#4b5563',
              fontWeight: 600
            }}
          >
            <button className="action-btn" onClick={handlePrevPage} disabled={pageNumber <= 1}>
              <ChevronLeft size={14} />
              <span>Page {pageNumber - 1}</span>
            </button>

            <div>
              Taj Company 16-Line • Page {pageNumber} of 548
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
