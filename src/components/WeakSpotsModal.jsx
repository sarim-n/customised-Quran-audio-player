import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  RotateCcw,
  Trash2,
  X,
  Target,
  Search,
  CheckCircle2,
  Plus,
  Flame,
  BookOpen,
  Play,
  Filter,
  Highlighter,
  Brain
} from 'lucide-react';
import {
  getWeakSpots,
  markMistake,
  removeWeakSpot,
  clearAllWeakSpots,
  toggleWordHighlight
} from '../services/weakSpotsStorage';

export function WeakSpotsModal({
  isOpen,
  onClose,
  viewMode = 'surah',
  currentSurahNumber = 1,
  currentJuzNumber = 1,
  currentSurahMeta = null,
  onReviseTriplet,
  onJumpToAyah,
  onShowToast
}) {
  const [weakSpots, setWeakSpots] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  
  // Filter Scope mode: 'scope' (Current Surah/Juz) vs 'all' (All Quran)
  const [filterMode, setFilterMode] = useState('scope');
  // Mistake Type filter: 'all' | 'word_highlight' | 'memory_gap'
  const [typeFilter, setTypeFilter] = useState('all');

  // Refresh weak spots list from storage
  const refreshList = () => {
    setWeakSpots(getWeakSpots());
  };

  useEffect(() => {
    if (!isOpen) return;
    refreshList();
    setFilterMode('scope'); // Default to scope filtering on open
    setTypeFilter('all');

    const handleUpdate = () => refreshList();
    window.addEventListener('quran-weak-spots-updated', handleUpdate);
    return () => window.removeEventListener('quran-weak-spots-updated', handleUpdate);
  }, [isOpen]);

  // Compute scope label for header
  const scopeName = useMemo(() => {
    if (viewMode === 'juz') {
      return `Juz ${currentJuzNumber}`;
    }
    return currentSurahMeta?.englishName
      ? `Surah ${currentSurahNumber}. ${currentSurahMeta.englishName}`
      : `Surah ${currentSurahNumber}`;
  }, [viewMode, currentSurahNumber, currentJuzNumber, currentSurahMeta]);

  // Count of weak spots in current scope vs overall
  const scopeWeakSpotsCount = useMemo(() => {
    if (viewMode === 'juz') {
      return weakSpots.filter(w => w.juzNumber === currentJuzNumber).length;
    }
    return weakSpots.filter(w => w.surahNumber === currentSurahNumber).length;
  }, [weakSpots, viewMode, currentSurahNumber, currentJuzNumber]);

  // Filter list by scope, type filter, AND search query
  const filteredWeakSpots = useMemo(() => {
    let list = weakSpots;

    // 1. Apply Scope Filter
    if (filterMode === 'scope') {
      if (viewMode === 'juz') {
        list = list.filter(item => item.juzNumber === currentJuzNumber);
      } else {
        list = list.filter(item => item.surahNumber === currentSurahNumber);
      }
    }

    // 2. Apply Mistake Type Filter
    if (typeFilter === 'word_highlight') {
      list = list.filter(item => item.mistakeType === 'word_highlight' || (Array.isArray(item.highlightedWords) && item.highlightedWords.length > 0));
    } else if (typeFilter === 'memory_gap') {
      list = list.filter(item => item.mistakeType === 'memory_gap' || (!item.mistakeType && (!item.highlightedWords || item.highlightedWords.length === 0)));
    }

    // 3. Apply Search Query Filter (Surah name, Juz name/number, Ayah number, translation)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const cleanQ = q.replace(/^(juz|para|surah)\s*/i, '');

      list = list.filter(item => {
        const matchSurahName = item.surahEnglishName.toLowerCase().includes(q);
        const matchSurahNum = item.surahNumber.toString() === cleanQ || item.surahNumber.toString() === q;
        const matchAyahNum = item.numberInSurah.toString() === cleanQ || item.numberInSurah.toString() === q;
        const matchJuz = item.juzNumber ? (
          item.juzNumber.toString() === cleanQ ||
          item.juzNumber.toString() === q ||
          `juz ${item.juzNumber}`.includes(q) ||
          `para ${item.juzNumber}`.includes(q)
        ) : false;
        const matchKey = `${item.surahNumber}:${item.numberInSurah}`.includes(q);
        const matchTrans = item.translation ? item.translation.toLowerCase().includes(q) : false;

        return matchSurahName || matchSurahNum || matchAyahNum || matchJuz || matchKey || matchTrans;
      });
    }

    return list;
  }, [weakSpots, filterMode, typeFilter, viewMode, currentSurahNumber, currentJuzNumber, searchQuery]);

  if (!isOpen) return null;

  const handleClearAll = () => {
    if (!confirmClearAll) {
      setConfirmClearAll(true);
      setTimeout(() => setConfirmClearAll(false), 4000);
      return;
    }
    clearAllWeakSpots();
    setConfirmClearAll(false);
    refreshList();
    if (onShowToast) onShowToast('All weak spot records cleared.');
  };

  const handleIncrement = (item) => {
    markMistake(item);
    refreshList();
    if (onShowToast) {
      onShowToast(`Increased mistake count for Surah ${item.surahEnglishName} Ayah ${item.numberInSurah}.`);
    }
  };

  const handleRemove = (item) => {
    removeWeakSpot(item.surahNumber, item.numberInSurah);
    refreshList();
    if (onShowToast) {
      onShowToast(`Removed Surah ${item.surahEnglishName} Ayah ${item.numberInSurah} from weak spots.`);
    }
  };

  const handleToggleWord = (spot, wordIdx) => {
    toggleWordHighlight(spot.surahNumber, spot.numberInSurah, wordIdx);
    refreshList();
  };

  const formatRelativeDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 2) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="modal-overlay" onClick={onClose} id="weak-spots-modal-overlay">
      <div
        className="modal-card"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '720px', width: '94%' }}
        id="weak-spots-modal-container"
      >
        {/* Header */}
        <div className="modal-header" style={{ paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Flame size={22} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>Weak Spots & Mistake Tracking</span>
              </h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Currently in <strong style={{ color: 'var(--primary)' }}>{scopeName}</strong>
              </div>
            </div>
          </div>

          <button className="icon-btn" onClick={onClose} title="Close Modal" id="btn-close-weak-spots-modal">
            <X size={20} />
          </button>
        </div>

        {/* Filter Pills & Stats Section */}
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
          {/* Top Row: Scope Filter Pills + Clear All */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                className={`preset-chip ${filterMode === 'scope' ? 'active' : ''}`}
                onClick={() => setFilterMode('scope')}
                style={{
                  padding: '0.3rem 0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
                id="btn-filter-weak-scope"
              >
                <Filter size={13} />
                <span>In {viewMode === 'juz' ? `Juz ${currentJuzNumber}` : 'Current Surah'} ({scopeWeakSpotsCount})</span>
              </button>

              <button
                className={`preset-chip ${filterMode === 'all' ? 'active' : ''}`}
                onClick={() => setFilterMode('all')}
                style={{
                  padding: '0.3rem 0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
                id="btn-filter-weak-all"
              >
                <BookOpen size={13} />
                <span>All Weak Spots ({weakSpots.length})</span>
              </button>
            </div>

            {/* Clear All Action */}
            {weakSpots.length > 0 && (
              <button
                className="action-btn danger"
                onClick={handleClearAll}
                title="Clear all recorded weak spots"
                id="btn-clear-all-weak-spots"
                style={{
                  fontSize: '0.72rem',
                  padding: '0.2rem 0.55rem',
                  borderColor: confirmClearAll ? 'red' : undefined,
                  background: confirmClearAll ? 'rgba(239, 68, 68, 0.2)' : undefined
                }}
              >
                <Trash2 size={12} />
                <span>{confirmClearAll ? 'Confirm Clear All?' : 'Clear All'}</span>
              </button>
            )}
          </div>

          {/* Type Filter Row: All, Word Slips, Memory Gaps */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: '0.2rem' }}>Type:</span>
            <button
              className={`preset-chip ${typeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setTypeFilter('all')}
              style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}
              id="btn-type-filter-all"
            >
              All Types
            </button>

            <button
              className={`preset-chip ${typeFilter === 'word_highlight' ? 'active' : ''}`}
              onClick={() => setTypeFilter('word_highlight')}
              style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
              id="btn-type-filter-word-slips"
            >
              <Highlighter size={12} color="#ef4444" />
              <span>Word Slips</span>
            </button>

            <button
              className={`preset-chip ${typeFilter === 'memory_gap' ? 'active' : ''}`}
              onClick={() => setTypeFilter('memory_gap')}
              style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
              id="btn-type-filter-memory-gaps"
            >
              <Brain size={12} color="#eab308" />
              <span>Memory Gaps</span>
            </button>
          </div>

          {/* Search Input Box */}
          <div style={{ position: 'relative' }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              placeholder="Search by Surah name, Juz number (e.g. Juz 7), Ayah number..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.75rem 0.45rem 2.2rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                color: 'var(--text-main)',
                fontSize: '0.85rem'
              }}
              id="input-search-weak-spots"
            />
          </div>
        </div>

        {/* Weak Spots List Body */}
        <div className="modal-body" style={{ maxHeight: '440px', overflowY: 'auto', padding: '0.85rem 1rem', background: 'var(--bg-subtle)' }}>
          {weakSpots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={42} color="var(--primary)" style={{ opacity: 0.8, marginBottom: '0.75rem' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                No Weak Spots Tracked Yet!
              </h3>
              <p style={{ fontSize: '0.85rem', maxWidth: '380px', margin: '0 auto', lineHeight: 1.5 }}>
                While reciting or revising, tap <strong>"Mark Mistake"</strong> on any Ayah card or in the player bar to track your weak spots here.
              </p>
            </div>
          ) : filteredWeakSpots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
              <Filter size={32} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                No weak spots found in {filterMode === 'scope' ? scopeName : 'search results'}.
              </div>
              {filterMode === 'scope' && weakSpots.length > 0 && (
                <button
                  className="action-btn primary"
                  onClick={() => setFilterMode('all')}
                  style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}
                >
                  Show All {weakSpots.length} Weak Spots Across Quran
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {filteredWeakSpots.map((spot, index) => {
                const words = spot.text ? spot.text.split(' ') : [];
                const highlighted = Array.isArray(spot.highlightedWords) ? spot.highlightedWords : [];
                // Soft alternating card background tints for crystal clear separation
                const isEven = index % 2 === 0;

                return (
                  <div
                    key={spot.id}
                    style={{
                      padding: '0.95rem 1.1rem',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-subtle)',
                      borderLeft: '4px solid #ef4444',
                      background: isEven ? 'var(--bg-surface)' : 'rgba(255, 255, 255, 0.03)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.55rem'
                    }}
                    id={`weak-spot-card-${spot.surahNumber}-${spot.numberInSurah}`}
                  >
                    {/* Card Top Header: Surah & Juz Badge + Mistake count */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--primary)' }}>
                          Surah {spot.surahNumber}. {spot.surahEnglishName}
                        </span>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-subtle)',
                            color: 'var(--text-main)',
                            fontWeight: 600,
                            border: '1px solid var(--border-subtle)'
                          }}
                        >
                          Ayah {spot.numberInSurah} • Juz {spot.juzNumber || 1}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: spot.mistakeType === 'word_highlight' ? '#ef4444' : '#eab308',
                            background: spot.mistakeType === 'word_highlight' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(234, 179, 8, 0.12)',
                            padding: '0.2rem 0.55rem',
                            borderRadius: 'var(--radius-full)',
                            border: spot.mistakeType === 'word_highlight' ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(234, 179, 8, 0.25)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          {spot.mistakeType === 'word_highlight' ? <Highlighter size={12} color="#ef4444" /> : <Brain size={12} color="#eab308" />}
                          {spot.mistakeType === 'word_highlight' ? 'Word Slip' : 'Memory Gap'}
                        </span>

                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {formatRelativeDate(spot.lastMarked)}
                        </span>
                      </div>
                    </div>

                    {/* Interactive Arabic Word Highlighting */}
                    {words.length > 0 && (
                      <div>
                        <div
                          className="arabic-quran-text"
                          style={{
                            fontSize: '1.3rem',
                            lineHeight: 1.95,
                            textAlign: 'right',
                            direction: 'rtl',
                            padding: '0.35rem 0',
                            color: 'var(--text-main)',
                            display: 'flex',
                            flexWrap: 'wrap',
                            justifyContent: 'flex-start',
                            gap: '0.35rem'
                          }}
                        >
                          {words.map((word, wIdx) => {
                            const isWordHighlighted = highlighted.includes(wIdx);
                            return (
                              <span
                                key={wIdx}
                                onClick={() => handleToggleWord(spot, wIdx)}
                                title="Click to toggle mistake highlight on this word"
                                style={{
                                  cursor: 'pointer',
                                  padding: '0 0.25rem',
                                  borderRadius: 'var(--radius-sm)',
                                  background: isWordHighlighted ? 'rgba(239, 68, 68, 0.22)' : 'transparent',
                                  color: isWordHighlighted ? '#ef4444' : 'inherit',
                                  borderBottom: isWordHighlighted ? '2px solid #ef4444' : '2px solid transparent',
                                  fontWeight: isWordHighlighted ? 700 : 'normal',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                {word}
                              </span>
                            );
                          })}
                        </div>

                        <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.1rem' }}>
                          <Highlighter size={11} color="#ef4444" />
                          <span>Tap any word above to highlight the exact spot of your mistake</span>
                        </div>
                      </div>
                    )}

                    {/* English Translation */}
                    {spot.translation && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.45 }}>
                        {spot.translation}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                        marginTop: '0.4rem',
                        paddingTop: '0.5rem',
                        borderTop: '1px solid var(--border-subtle)',
                        flexWrap: 'wrap'
                      }}
                    >
                      {/* Primary Triplet Revision Button */}
                      <button
                        className="action-btn primary"
                        onClick={() => {
                          onClose();
                          if (onReviseTriplet) onReviseTriplet(spot);
                        }}
                        title="Play triplet: Previous Ayah → Weak Ayah → Next Ayah, repeated"
                        id={`btn-revise-triplet-${spot.surahNumber}-${spot.numberInSurah}`}
                        style={{ fontSize: '0.78rem', padding: '0.35rem 0.7rem' }}
                      >
                        <RotateCcw size={13} />
                        <span>Revise Triplet (Prev → Weak → Next)</span>
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {/* Jump to Ayah button */}
                        <button
                          className="action-btn"
                          onClick={() => {
                            onClose();
                            if (onJumpToAyah) onJumpToAyah(spot);
                          }}
                          title="Jump to this Ayah in main view"
                          id={`btn-jump-weak-spot-${spot.surahNumber}-${spot.numberInSurah}`}
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.55rem' }}
                        >
                          <Target size={13} />
                          <span>Go to Ayah</span>
                        </button>

                        {/* Remove button */}
                        <button
                          className="action-btn danger"
                          onClick={() => handleRemove(spot)}
                          title="Remove from weak spots"
                          id={`btn-remove-weak-spot-${spot.surahNumber}-${spot.numberInSurah}`}
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.55rem' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Triplet revision loops 3 ayahs for optimal memorization retention.
          </div>
          <button className="action-btn" onClick={onClose} id="btn-done-weak-spots">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
