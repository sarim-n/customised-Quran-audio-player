import React, { useState } from 'react';
import { Play, Pause, Repeat, Bookmark, Flag } from 'lucide-react';
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
  showTranslation,
  onPlay,
  onPause,
  onRepeatAyah,
  onSetRangeStart,
  onSetRangeEnd
}) {
  const [showRepeatMenu, setShowRepeatMenu] = useState(false);
  const [isCustomActive, setIsCustomActive] = useState(false);
  const [customRepeatValue, setCustomRepeatValue] = useState('');

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

          {/* Repeat Ayah Button */}
          <div style={{ position: 'relative' }}>
            <button
              className={`action-btn ${isRepeatingThisAyah ? 'active' : ''}`}
              onClick={() => setShowRepeatMenu(!showRepeatMenu)}
              title={`Repeat Ayah ${ayah.numberInSurah} multiple times`}
              id={`ayah-repeat-btn-${ayah.numberInSurah}`}
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
              </div>
            )}
          </div>

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
