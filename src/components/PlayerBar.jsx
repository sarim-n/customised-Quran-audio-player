import React from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, Volume2, User, Loader2, Repeat, RotateCcw } from 'lucide-react';
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
  onOpenReciterModal
}) {
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSliderChange = (e) => {
    const time = parseFloat(e.target.value);
    onSeek(time);
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

  return (
    <footer className="bottom-player" id="bottom-audio-player">
      <div className="player-inner">
        {/* Scrubber row */}
        <div className="scrubber-row">
          <span>{formatTime(audioProgress.currentTime)}</span>
          <input
            type="range"
            min="0"
            max={audioProgress.duration || 100}
            step="0.1"
            value={audioProgress.currentTime || 0}
            onChange={handleSliderChange}
            className="scrubber-slider"
            aria-label="Seek time"
            id="audio-scrubber"
          />
          <span>{formatTime(audioProgress.duration)}</span>
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
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
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
              className="control-btn"
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
            {/* Speed Selector Presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
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

            {/* Reciter trigger */}
            <button
              className="action-btn btn-pill"
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
