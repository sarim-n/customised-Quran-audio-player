import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Repeat, Bookmark, Flag, X, Layers, Flame, Highlighter, Brain, Trash2 } from 'lucide-react';
import { REPEAT_PRESETS } from '../data/quranMeta';

export function AyahCard({
  ayah,
  index,
  viewMode,
  isCurrentAyah,
  isHighlighted,
  isPlaying,
  playbackMode,
  repeatTarget,
  currentCycle,
  isInRange,
  isRangeStart,
  isRangeEnd,
  isRangeActive,
  showTranslation,
  onPlay,
  onPause,
  onRepeatAyah,
  onRepeatRuku,
  onSetRangeStart,
  onSetRangeEnd,
  onClearRange,
  onMarkMistake,
  onRemoveWeakSpot,
  onToggleWordHighlight,
  isWeakSpot = false,
  weakSpotItem = null
}) {
  const [showRepeatMenu, setShowRepeatMenu] = useState(false);
  const [showMistakeMenu, setShowMistakeMenu] = useState(false);
  const [isCustomActive, setIsCustomActive] = useState(false);
  const [customRepeatValue, setCustomRepeatValue] = useState('');
  const [isEditingHighlights, setIsEditingHighlights] = useState(false);

  const repeatMenuRef = useRef(null);
  const mistakeMenuRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (showRepeatMenu && repeatMenuRef.current && !repeatMenuRef.current.contains(e.target)) {
        setShowRepeatMenu(false);
        setIsCustomActive(false);
      }
      if (showMistakeMenu && mistakeMenuRef.current && !mistakeMenuRef.current.contains(e.target)) {
        setShowMistakeMenu(false);
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, [showRepeatMenu, showMistakeMenu]);

  // Pointer event handlers for Long Press vs Click
  const handlePointerDown = (e) => {
    // Only primary button
    if (e.button !== undefined && e.button !== 0) return;

    isLongPressRef.current = false;
    startPosRef.current = { x: e.clientX, y: e.clientY };

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setShowRepeatMenu(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(40); } catch {}
      }
    }, 500); // 500ms threshold for long press
  };

  const handlePointerMove = (e) => {
    const dx = Math.abs(e.clientX - startPosRef.current.x);
    const dy = Math.abs(e.clientY - startPosRef.current.y);
    if (dx > 10 || dy > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handlePointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleRepeatClick = (e) => {
    e.preventDefault();
    // If long-press was triggered, ignore normal click
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }

    // Normal click: start repeating infinitely!
    setShowRepeatMenu(false);
    setIsCustomActive(false);
    onRepeatAyah(index, 'infinity');
  };

  const isRepeatingThisAyah = isCurrentAyah && isPlaying && playbackMode === 'ayah';

  const handleRepeatPreset = (count) => {
    if (count === 'custom') {
      setIsCustomActive(true);
      return;
    }
    setShowRepeatMenu(false);
    setIsCustomActive(false);
    onRepeatAyah(index, count);
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    const count = parseInt(customRepeatValue, 10);
    if (!isNaN(count) && count > 0) {
      setShowRepeatMenu(false);
      setIsCustomActive(false);
      onRepeatAyah(index, Math.min(count, 1000));
    } else {
      alert('Please enter a positive repetition count (e.g. 20).');
    }
  };

  return (
    <div
      id={`ayah-${ayah.number}`}
      className={`ayah-card ${isCurrentAyah && isPlaying ? 'playing' : ''} ${isInRange ? 'in-range' : ''} ${isHighlighted ? 'highlight-flash' : ''}`}
    >
      {/* Top action & info bar */}
      <div className="ayah-top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Authentic Surah-wise Ayah numbering */}
          <span className="ayah-badge" title={`Ayah ${ayah.numberInSurah} in ${ayah.surahEnglishName || 'Surah'}`}>
            {viewMode === 'juz'
              ? `${ayah.surahEnglishName || `Surah ${ayah.surahNumber}`} • Ayah ${ayah.numberInSurah}`
              : `Ayah ${ayah.numberInSurah}`}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
            Juz {ayah.juz} • Page {ayah.page}
          </span>

          {/* Active Ayah Repeating indicator */}
          {isRepeatingThisAyah && (
            <span className="badge-tag">
              <Repeat size={12} />
              Repeat: {currentCycle} / {repeatTarget === 'infinity' ? '∞' : repeatTarget}
            </span>
          )}

          {/* Range marker tags */}
          {isRangeStart && (
            <span className="badge-tag" style={{ background: 'var(--gold-bg)', color: 'var(--gold-text)' }}>
              Range Start
            </span>
          )}
          {isRangeEnd && (
            <span className="badge-tag" style={{ background: 'var(--gold-bg)', color: 'var(--gold-text)' }}>
              Range End
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="ayah-actions">
          {/* Play / Pause button */}
          {isCurrentAyah && isPlaying ? (
            <button
              className="action-btn primary"
              onClick={onPause}
              title="Pause Audio"
              id={`ayah-pause-btn-${ayah.numberInSurah}`}
            >
              <Pause size={14} />
              <span>Pause</span>
            </button>
          ) : (
            <button
              className="action-btn"
              onClick={() => onPlay(index)}
              title="Play this Ayah"
              id={`ayah-play-btn-${ayah.numberInSurah}`}
            >
              <Play size={14} />
              <span>Play</span>
            </button>
          )}

          {/* Repeat Ayah Button (Click = Infinite Repeat, Long Press = Options Menu) */}
          <div ref={repeatMenuRef} style={{ position: 'relative' }}>
            <button
              className={`action-btn ${isRepeatingThisAyah ? 'active' : ''}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onClick={handleRepeatClick}
              title={`Click to repeat Ayah ${ayah.numberInSurah} infinitely • Long press for options`}
              id={`ayah-repeat-btn-${ayah.numberInSurah}`}
              style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
            >
              <Repeat size={14} />
              <span>Repeat</span>
            </button>

            {/* Repeat Dropdown / Popover */}
            {showRepeatMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '0.4rem',
                  zIndex: 30,
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  minWidth: '220px'
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Repeat {ayah.surahEnglishName || 'Surah'} Ayah {ayah.numberInSurah}:
                </div>

                <div className="preset-group">
                  {REPEAT_PRESETS.map(preset => (
                    <button
                      key={preset}
                      className="preset-chip"
                      onClick={() => handleRepeatPreset(preset)}
                      id={`ayah-${ayah.numberInSurah}-preset-${preset}`}
                    >
                      {preset === 'infinity' ? '∞' : `${preset}×`}
                    </button>
                  ))}
                  <button
                    className={`preset-chip ${isCustomActive ? 'active' : ''}`}
                    onClick={() => handleRepeatPreset('custom')}
                    id={`ayah-${ayah.numberInSurah}-preset-custom`}
                  >
                    Custom
                  </button>
                </div>

                {/* Custom Input */}
                {isCustomActive && (
                  <form onSubmit={handleCustomSubmit} style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem' }}>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      placeholder="e.g. 20"
                      value={customRepeatValue}
                      onChange={e => setCustomRepeatValue(e.target.value)}
                      className="number-input"
                      autoFocus
                      id={`ayah-${ayah.numberInSurah}-custom-input`}
                    />
                    <button type="submit" className="action-btn primary" style={{ padding: '0.2rem 0.5rem' }}>
                      Start
                    </button>
                  </form>
                )}

                {/* Repeat Ruku option in popover */}
                {onRepeatRuku && (
                  <button
                    type="button"
                    className="action-btn"
                    onClick={() => {
                      setShowRepeatMenu(false);
                      onRepeatRuku(index, 'infinity');
                    }}
                    style={{ marginTop: '0.25rem', width: '100%', justifyContent: 'center' }}
                    id={`popover-repeat-ruku-${ayah.numberInSurah}`}
                  >
                    <Layers size={13} />
                    <span>Repeat Entire Ruku (∞)</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Repeat Current Ruku Button */}
          {onRepeatRuku && (
            <button
              className={`action-btn ${isCurrentAyah && isPlaying && playbackMode === 'ruku' ? 'active' : ''}`}
              onClick={() => onRepeatRuku(index, 'infinity')}
              title={`Repeat the entire Ruku containing Ayah ${ayah.numberInSurah} infinitely`}
              id={`ayah-repeat-ruku-btn-${ayah.numberInSurah}`}
            >
              <Layers size={13} />
              <span>Repeat Ruku</span>
            </button>
          )}

          {/* Mark Mistake Container & Popover */}
          {onMarkMistake && (
            <div style={{ position: 'relative' }} ref={mistakeMenuRef}>
              <button
                className={`action-btn ${isWeakSpot ? 'warning' : ''}`}
                onClick={() => setShowMistakeMenu(!showMistakeMenu)}
                title={isWeakSpot ? 'Marked as Weak Spot. Click to edit or remove.' : 'Mark a mistake on Ayah ' + ayah.numberInSurah}
                id={`ayah-mark-mistake-btn-${ayah.numberInSurah}`}
                style={
                  isWeakSpot
                    ? {
                        borderColor: 'rgba(239, 68, 68, 0.5)',
                        color: '#ef4444',
                        background: 'rgba(239, 68, 68, 0.12)',
                        fontWeight: 600
                      }
                    : {}
                }
              >
                <Flame size={13} color={isWeakSpot ? '#ef4444' : 'currentColor'} />
                <span>
                  {isWeakSpot
                    ? weakSpotItem?.mistakeType === 'word_highlight'
                      ? 'Word Slip'
                      : 'Memory Gap'
                    : 'Mark Mistake'}
                </span>
              </button>

              {/* Mistake Options Popover */}
              {showMistakeMenu && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '0.4rem',
                    zIndex: 35,
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: '0.65rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.45rem',
                    minWidth: '220px'
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Mark Mistake Type:
                  </div>

                  {/* Option 1: Highlight Word(s) */}
                  <button
                    type="button"
                    className="action-btn"
                    onClick={() => {
                      setShowMistakeMenu(false);
                      if (!isWeakSpot) {
                        onMarkMistake(ayah, 'word_highlight');
                      }
                      setIsEditingHighlights(true);
                    }}
                    style={{ width: '100%', justifyContent: 'flex-start', gap: '0.5rem', padding: '0.4rem 0.6rem' }}
                    id={`btn-mark-word-slip-${ayah.numberInSurah}`}
                  >
                    <Highlighter size={14} color="#ef4444" />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>Highlight Word(s)</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tap exact words in Arabic text</div>
                    </div>
                  </button>

                  {/* Option 2: Memory Gap / Forgot Ayah */}
                  <button
                    type="button"
                    className="action-btn"
                    onClick={() => {
                      setShowMistakeMenu(false);
                      onMarkMistake(ayah, 'memory_gap');
                      setIsEditingHighlights(false);
                    }}
                    style={{ width: '100%', justifyContent: 'flex-start', gap: '0.5rem', padding: '0.4rem 0.6rem' }}
                    id={`btn-mark-memory-gap-${ayah.numberInSurah}`}
                  >
                    <Brain size={14} color="#eab308" />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>Forgot Ayah / Memory Gap</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Entire verse forgotten</div>
                    </div>
                  </button>

                  {/* Remove Weak Spot option if already marked */}
                  {isWeakSpot && onRemoveWeakSpot && (
                    <button
                      type="button"
                      className="action-btn danger"
                      onClick={() => {
                        setShowMistakeMenu(false);
                        setIsEditingHighlights(false);
                        onRemoveWeakSpot(ayah);
                      }}
                      style={{ width: '100%', justifyContent: 'flex-start', gap: '0.5rem', marginTop: '0.2rem', padding: '0.4rem 0.6rem' }}
                      id={`btn-remove-weak-spot-${ayah.numberInSurah}`}
                    >
                      <Trash2 size={14} />
                      <span>Remove Weak Spot</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Set Range Start & End Buttons */}
          <button
            className={`action-btn ${isRangeStart ? 'active' : ''}`}
            onClick={onSetRangeStart}
            title={`Set Ayah ${ayah.numberInSurah} as range start`}
            id={`ayah-set-start-${ayah.numberInSurah}`}
          >
            <Bookmark size={13} />
            <span>Set Start</span>
          </button>

          <button
            className={`action-btn ${isRangeEnd ? 'active' : ''}`}
            onClick={onSetRangeEnd}
            title={`Set Ayah ${ayah.numberInSurah} as range end`}
            id={`ayah-set-end-${ayah.numberInSurah}`}
          >
            <Flag size={13} />
            <span>Set End</span>
          </button>

          {/* Cancel / Clear Range Button '✕' */}
          {isRangeActive && (
            <button
              className="action-btn danger"
              onClick={onClearRange}
              title="Cancel range repetition loop (✕)"
              id={`ayah-clear-range-${ayah.numberInSurah}`}
              style={{
                borderColor: 'var(--danger)',
                color: 'var(--danger)',
                background: 'var(--danger-light)',
                fontWeight: 700,
                padding: '0.25rem 0.55rem'
              }}
            >
              <X size={13} />
              <span>✕</span>
            </button>
          )}
        </div>
      </div>

      {/* Highlight Mode Banner */}
      {isEditingHighlights && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
            padding: '0.4rem 0.75rem',
            background: 'rgba(239, 68, 68, 0.12)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            marginBottom: '0.5rem'
          }}
        >
          <span style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Highlighter size={14} />
            Tap Arabic words below to highlight mistake locations:
          </span>
          <button
            className="action-btn primary"
            onClick={() => setIsEditingHighlights(false)}
            style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
            id={`btn-done-highlighting-${ayah.numberInSurah}`}
          >
            Done Highlighting
          </button>
        </div>
      )}

      {/* Arabic Uthmani Text (With Interactive Word Highlighting when Weak Spot & Editing) */}
      <div className="arabic-quran-text ayah-arabic">
        {isWeakSpot && ayah.text ? (
          ayah.text.split(' ').map((word, wIdx) => {
            const isWordHighlighted = Array.isArray(weakSpotItem?.highlightedWords) && weakSpotItem.highlightedWords.includes(wIdx);
            return (
              <span
                key={wIdx}
                onClick={isEditingHighlights ? () => onToggleWordHighlight && onToggleWordHighlight(ayah, wIdx) : undefined}
                title={isEditingHighlights ? "Click to toggle mistake highlight on this word" : undefined}
                style={{
                  cursor: isEditingHighlights ? 'pointer' : 'default',
                  padding: '0 0.15rem',
                  borderRadius: 'var(--radius-sm)',
                  background: isWordHighlighted ? 'rgba(239, 68, 68, 0.25)' : 'transparent',
                  color: isWordHighlighted ? '#ef4444' : 'inherit',
                  borderBottom: isWordHighlighted ? '2px solid #ef4444' : '2px solid transparent',
                  fontWeight: isWordHighlighted ? 700 : 'normal',
                  transition: 'all 0.15s ease'
                }}
              >
                {word}{' '}
              </span>
            );
          })
        ) : (
          ayah.text
        )}
      </div>

      {/* English Translation */}
      {showTranslation && ayah.translation && (
        <div className="ayah-translation">
          {ayah.translation}
        </div>
      )}
    </div>
  );
}
