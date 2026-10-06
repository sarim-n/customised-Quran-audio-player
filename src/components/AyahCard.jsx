import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Repeat, Bookmark, Flag, X, Layers, Flame } from 'lucide-react';
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
  mistakeCount = 0
}) {
  const [showRepeatMenu, setShowRepeatMenu] = useState(false);
  const [isCustomActive, setIsCustomActive] = useState(false);
  const [customRepeatValue, setCustomRepeatValue] = useState('');

  const repeatMenuRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showRepeatMenu) return;
    const handleOutsideClick = (e) => {
      if (repeatMenuRef.current && !repeatMenuRef.current.contains(e.target)) {
        setShowRepeatMenu(false);
        setIsCustomActive(false);
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, [showRepeatMenu]);

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

          {/* Mark Mistake Button */}
          {onMarkMistake && (
            <button
              className={`action-btn ${mistakeCount > 0 ? 'warning' : ''}`}
              onClick={() => onMarkMistake(ayah)}
              title={mistakeCount > 0 ? `Marked mistake ${mistakeCount} times. Click to increment.` : `Mark a mistake on Ayah ${ayah.numberInSurah} with one click`}
              id={`ayah-mark-mistake-btn-${ayah.numberInSurah}`}
              style={
                mistakeCount > 0
                  ? {
                      borderColor: 'rgba(239, 68, 68, 0.4)',
                      color: '#ef4444',
                      background: 'rgba(239, 68, 68, 0.08)',
                      fontWeight: 600
                    }
                  : {}
              }
            >
              <Flame size={13} color={mistakeCount > 0 ? '#ef4444' : 'currentColor'} />
              <span>Mark Mistake {mistakeCount > 0 ? `(${mistakeCount})` : ''}</span>
            </button>
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

      {/* Large Arabic Uthmani Text */}
      <div className="arabic-quran-text ayah-arabic">
        {ayah.text}
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
