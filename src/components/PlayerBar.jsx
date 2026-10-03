import React, { useState } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, Volume2, User, Loader2, Repeat, RotateCcw, Layers } from 'lucide-react';
import { PLAYBACK_SPEEDS } from '../data/quranMeta';

export function PlayerBar({
  currentAyah,
  currentAyahIndex = 0,
  totalAyahs = 0,
  currentSurah,
  currentJuz,
  viewMode,
  isPlaying,
  isBuffering,
  playbackSpeed,
  reciter,
  audioProgress,
  playbackMode,
  repeatTarget,
  currentCycle,
  rangeStart,
  rangeEnd,
  rangeSurahName,
  errorMessage,
  onTogglePlayPause,
  onStop,
  onPrev,
  onNext,
  onChangeSpeed,
  onSeek,
  onSeekOverall,
  onOpenReciterModal
}) {
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Continuous overall progress across the entire Surah or Juz
  const intraAyahProgress = (audioProgress.duration > 0 && Number.isFinite(audioProgress.currentTime))
    ? Math.min(1, Math.max(0, audioProgress.currentTime / audioProgress.duration))
    : 0;

  // 1-based continuous position (e.g., from 1.0 to totalAyahs + 0.99)
  const currentOverallValue = totalAyahs > 0
    ? (currentAyahIndex + 1) + intraAyahProgress
    : 1;

  // Local drag state for smooth dragging experience
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(null);

  const displayValue = isDragging && dragValue !== null ? dragValue : currentOverallValue;
  const activeAyahNum = isDragging && dragValue !== null
    ? Math.min(totalAyahs, Math.max(1, Math.floor(dragValue)))
    : (currentAyahIndex + 1);

  const handleSliderInput = (e) => {
    setIsDragging(true);
    setDragValue(parseFloat(e.target.value));
  };

  const handleSliderCommit = (e) => {
    const val = parseFloat(e.target.value);
    setIsDragging(false);
    setDragValue(null);

    if (totalAyahs <= 0) return;

    // Calculate 0-based target Ayah index and intra-Ayah fraction
    const targetAyahIndex = Math.min(totalAyahs - 1, Math.max(0, Math.floor(val) - 1));
    const fraction = Math.max(0, Math.min(1, val - Math.floor(val)));

    if (onSeekOverall) {
      onSeekOverall(targetAyahIndex, fraction);
    } else if (onSeek) {
      onSeek(fraction * (audioProgress.duration || 0));
    }
  };

  // Formatted repetition cycle text
  const renderRepetitionStatus = () => {
    if (playbackMode === 'ayah') {
      return (
        <span className="badge-tag">
          <Repeat size={12} />
          Repeat Ayah {currentAyah?.numberInSurah}: {currentCycle} / {repeatTarget === 'infinity' ? '∞' : `${repeatTarget}×`}
        </span>
      );
    }
    if (playbackMode === 'range') {
      return (
        <span className="badge-tag">
          <Repeat size={12} />
          Range: {rangeSurahName ? `${rangeSurahName} ` : ''}Ayahs {rangeStart}–{rangeEnd} • Cycle {currentCycle} / {repeatTarget === 'infinity' ? '∞' : `${repeatTarget}×`}
        </span>
      );
    }
    if (playbackMode === 'ruku') {
      return (
        <span className="badge-tag" style={{ background: 'var(--primary-light)', color: 'var(--primary)', borderColor: 'var(--primary)' }}>
          <Layers size={12} />
          Ruku Loop: {rangeSurahName ? `${rangeSurahName} ` : ''}Ayahs {rangeStart}–{rangeEnd} • Cycle {currentCycle} / {repeatTarget === 'infinity' ? '∞' : `${repeatTarget}×`}
        </span>
      );
    }
    if (playbackMode === 'surah') {
      return (
        <span className="badge-tag">
          <RotateCcw size={12} />
          Surah Loop • Cycle {currentCycle} / {repeatTarget === 'infinity' ? '∞' : `${repeatTarget}×`}
        </span>
      );
    }
    if (playbackMode === 'juz') {
      return (
        <span className="badge-tag">
          <RotateCcw size={12} />
          Juz Loop • Cycle {currentCycle} / {repeatTarget === 'infinity' ? '∞' : `${repeatTarget}×`}
        </span>
      );
    }
    return (
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Normal Sequential Playback
      </span>
    );
  };

  const handleCycleSpeed = () => {
    const idx = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
    const nextIdx = (idx + 1) % PLAYBACK_SPEEDS.length;
    onChangeSpeed(PLAYBACK_SPEEDS[nextIdx]);
  };

  return (
    <footer className="bottom-player" id="bottom-audio-player">
      <div className="player-inner">
        {/* Scrubber row: Surah-wide or Juz-wide */}
        <div className="scrubber-row">
          <span
            className="scrubber-time"
            title={
              viewMode === 'juz'
                ? `Juz ${currentJuz}: Ayah ${activeAyahNum} of ${totalAyahs}`
                : `${currentSurah?.englishName || 'Surah'}: Ayah ${activeAyahNum} of ${totalAyahs}`
            }
          >
            {isDragging
              ? `Seek ${activeAyahNum}/${totalAyahs}`
              : viewMode === 'juz'
                ? `Juz ${currentJuz} • ${activeAyahNum}/${totalAyahs}`
                : `Ayah ${currentAyah?.numberInSurah || activeAyahNum} of ${totalAyahs}`}
          </span>
          <input
            type="range"
            min="1"
            max={Math.max(1, totalAyahs)}
            step="0.05"
            value={Math.min(Math.max(1, totalAyahs), Math.max(1, displayValue))}
            onInput={handleSliderInput}
            onChange={handleSliderCommit}
            onPointerUp={handleSliderCommit}
            onTouchEnd={handleSliderCommit}
            className="scrubber-slider"
            aria-label={viewMode === 'juz' ? `Juz ${currentJuz} overall progress` : `${currentSurah?.englishName || 'Surah'} overall progress`}
            id="audio-scrubber"
            disabled={totalAyahs <= 0}
          />
          <span className="scrubber-time" title="Current Ayah audio elapsed / duration">
            {formatTime(audioProgress.currentTime)} / {formatTime(audioProgress.duration)}
          </span>
        </div>

        {/* Player controls row */}
        <div className="player-top-row">
          {/* Left: Info & Mode Status */}
          <div className="player-info">
            <div className="player-avatar" title={`Reciter: ${reciter?.name}`}>
              {isBuffering ? (
                <Loader2 size={22} className="spin-animation" />
              ) : (
                <Volume2 size={22} />
              )}
            </div>

            <div className="player-details">
              <div className="player-surah-title">
                {currentAyah ? (
                  <>
                    <span>{currentAyah.surahEnglishName || currentSurah?.englishName || `Surah ${currentAyah.surahNumber}`}</span>
                    <span className="player-ayah-num" style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                      {' '}• Ayah {currentAyah.numberInSurah} {viewMode === 'juz' ? `(Juz ${currentJuz})` : ''}
                    </span>
                  </>
                ) : (
                  <span>Ready to Play</span>
                )}
              </div>

              <div className="player-mode-badge">
                {renderRepetitionStatus()}
              </div>

              {errorMessage && (
                <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.2rem' }}>
                  {errorMessage}
                </div>
              )}
            </div>
          </div>

          {/* Center: Playback Controls */}
          <div className="player-controls">
            {/* Previous Ayah */}
            <button
              className="control-btn"
              onClick={onPrev}
              title="Previous Ayah"
              id="player-prev-btn"
            >
              <SkipBack size={18} />
            </button>

            {/* Stop Button */}
            <button
              className="control-btn stop-control-btn"
              onClick={onStop}
              title="Stop Audio and Reset Repetition"
              id="player-stop-btn"
            >
              <Square size={16} />
            </button>

            {/* Play / Pause Button */}
            <button
              className="play-pause-btn"
              onClick={onTogglePlayPause}
              title={isPlaying ? 'Pause' : 'Play'}
              id="player-play-pause-btn"
            >
              {isBuffering ? (
                <Loader2 size={24} className="spin-animation" />
              ) : isPlaying ? (
                <Pause size={24} />
              ) : (
                <Play size={24} style={{ marginLeft: '3px' }} />
              )}
            </button>

            {/* Next Ayah */}
            <button
              className="control-btn"
              onClick={onNext}
              title="Next Ayah"
              id="player-next-btn"
            >
              <SkipForward size={18} />
            </button>
          </div>

          {/* Right: Playback Speed & Reciter */}
          <div className="player-extra-controls">
            {/* Desktop Speed Selector Presets */}
            <div className="desktop-speed-group" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginRight: '0.15rem' }}>Speed:</span>
              {PLAYBACK_SPEEDS.map(speed => (
                <button
                  key={speed}
                  className={`speed-badge-btn ${playbackSpeed === speed ? 'active' : ''}`}
                  onClick={() => onChangeSpeed(speed)}
                  id={`speed-btn-${speed}`}
                >
                  {speed}×
                </button>
              ))}
            </div>

            {/* Mobile single compact speed button */}
            <button
              className="speed-badge-btn mobile-speed-btn"
              onClick={handleCycleSpeed}
              title="Tap to cycle playback speed"
              id="mobile-speed-cycle-btn"
            >
              {playbackSpeed}×
            </button>

            {/* Reciter trigger */}
            <button
              className="action-btn btn-pill player-reciter-pill"
              onClick={onOpenReciterModal}
              title="Change Reciter"
              id="player-reciter-btn"
            >
              <User size={13} />
              <span style={{ maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {reciter?.name?.split(' ')?.[0] || 'Reciter'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
