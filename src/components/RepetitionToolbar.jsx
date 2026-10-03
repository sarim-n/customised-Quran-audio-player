import React, { useState, useEffect, useMemo } from 'react';
import { Repeat, Play, RotateCcw, Square, ArrowRight, Search, BookOpen, Layers } from 'lucide-react';
import { REPEAT_PRESETS, SURAHS } from '../data/quranMeta';

export function RepetitionToolbar({
  viewMode,
  ayahs = [],
  ayahsCount,
  currentSurah,
  currentJuz,
  rangeSurahNumber,
  onRangeSurahChange,
  rangeStart,
  rangeEnd,
  rangeRepeatCount,
  onRangeStartChange,
  onRangeEndChange,
  onStartRangeRepetition,
  playbackMode,
  repeatTarget,
  currentCycle,
  currentAyah,
  isPlaying,
  onStopPlayback,
  onRepeatSurah,
  onRepeatJuz,
  surahRepeatCount,
  juzRepeatCount
}) {
  const [activeTab, setActiveTab] = useState('range'); // 'range' | 'surah' | 'juz'
  const [selectedRangeRepeat, setSelectedRangeRepeat] = useState(rangeRepeatCount || 3);
  const [customRangeVal, setCustomRangeVal] = useState('');
  const [isCustomRange, setIsCustomRange] = useState(false);

  const [selectedSurahRepeat, setSelectedSurahRepeat] = useState(surahRepeatCount || 1);
  const [customSurahVal, setCustomSurahVal] = useState('');
  const [isCustomSurah, setIsCustomSurah] = useState(false);

  const [selectedJuzRepeat, setSelectedJuzRepeat] = useState(juzRepeatCount || 1);
  const [customJuzVal, setCustomJuzVal] = useState('');
  const [isCustomJuz, setIsCustomJuz] = useState(false);

  const [surahFilterQuery, setSurahFilterQuery] = useState('');

  // Sync tab with viewMode (keep 'range' if selected!)
  useEffect(() => {
    if (viewMode === 'surah' && activeTab === 'juz') {
      setActiveTab('surah');
    } else if (viewMode === 'juz' && activeTab === 'surah') {
      setActiveTab('juz');
    }
  }, [viewMode]);

  // Compute Surahs available in current Juz view
  const surahsInJuz = useMemo(() => {
    if (!ayahs || ayahs.length === 0) return [];
    const map = new Map();
    ayahs.forEach(a => {
      const sNum = a.surahNumber;
      if (!map.has(sNum)) {
        const meta = SURAHS.find(s => s.number === sNum);
        map.set(sNum, {
          surahNumber: sNum,
          surahName: a.surahName || meta?.name || `سورة ${sNum}`,
          surahEnglishName: a.surahEnglishName || meta?.englishName || `Surah ${sNum}`,
          englishNameTranslation: meta?.englishNameTranslation || '',
          totalAyahsInSurah: meta?.numberOfAyahs || 0,
          startAyah: a.numberInSurah,
          endAyah: a.numberInSurah,
          totalInView: 1
        });
      } else {
        const item = map.get(sNum);
        item.endAyah = Math.max(item.endAyah, a.numberInSurah);
        item.startAyah = Math.min(item.startAyah, a.numberInSurah);
        item.totalInView += 1;
      }
    });
    return Array.from(map.values());
  }, [ayahs]);

  // Ensure a valid rangeSurahNumber is selected when in Juz view
  useEffect(() => {
    if (viewMode === 'juz' && surahsInJuz.length > 0) {
      const exists = surahsInJuz.some(s => s.surahNumber === rangeSurahNumber);
      if (!exists && onRangeSurahChange) {
        onRangeSurahChange(surahsInJuz[0].surahNumber);
      }
    }
  }, [viewMode, surahsInJuz, rangeSurahNumber, onRangeSurahChange]);

  // Currently selected Surah for range repetition
  const selectedSurah = useMemo(() => {
    if (viewMode === 'surah') {
      return {
        surahNumber: currentSurah?.number || 1,
        surahName: currentSurah?.name || '',
        surahEnglishName: currentSurah?.englishName || 'Current Surah',
        startAyah: 1,
        endAyah: ayahsCount || currentSurah?.numberOfAyahs || 1,
        totalInView: ayahsCount || 1,
        totalAyahsInSurah: currentSurah?.numberOfAyahs || ayahsCount || 1
      };
    }
    const found = surahsInJuz.find(s => s.surahNumber === rangeSurahNumber);
    return found || surahsInJuz[0] || null;
  }, [viewMode, currentSurah, ayahsCount, surahsInJuz, rangeSurahNumber]);

  // Filtered surahs in Juz for search
  const filteredSurahsInJuz = useMemo(() => {
    if (!surahFilterQuery.trim()) return surahsInJuz;
    const q = surahFilterQuery.toLowerCase().trim();
    return surahsInJuz.filter(s =>
      s.surahNumber.toString() === q ||
      s.surahEnglishName.toLowerCase().includes(q) ||
      (s.englishNameTranslation && s.englishNameTranslation.toLowerCase().includes(q)) ||
      s.surahName.includes(q)
    );
  }, [surahsInJuz, surahFilterQuery]);

  // Handle Surah Selection in Juz Mode
  const handleSelectSurahInJuz = (surahItem) => {
    if (!surahItem) return;
    if (onRangeSurahChange) {
      onRangeSurahChange(surahItem.surahNumber);
    }
    // Set sensible default range for selected surah
    onRangeStartChange(surahItem.startAyah);
    onRangeEndChange(Math.min(surahItem.endAyah, surahItem.startAyah + 4));
  };

  // Handle Range Preset Click
  const handleRangePresetClick = (preset) => {
    if (preset === 'custom') {
      setIsCustomRange(true);
    } else {
      setIsCustomRange(false);
      setSelectedRangeRepeat(preset);
    }
  };

  // Handle Custom Range Input
  const handleCustomRangeChange = (e) => {
    const val = e.target.value;
    setCustomRangeVal(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0 && num <= 1000) {
      setSelectedRangeRepeat(num);
    }
  };

  // Launch Range Repetition
  const handleLaunchRange = () => {
    let count = selectedRangeRepeat;
    if (isCustomRange) {
      const parsed = parseInt(customRangeVal, 10);
      if (isNaN(parsed) || parsed <= 0) {
        alert('Please enter a valid positive number for repetition count (e.g. 15).');
        return;
      }
      count = Math.min(parsed, 1000);
    }

    if (!selectedSurah) return;

    // Gracefully clamp to selected surah's available bounds
    const s = Math.max(selectedSurah.startAyah, Math.min(rangeStart, selectedSurah.endAyah));
    const e = Math.max(selectedSurah.startAyah, Math.min(rangeEnd, selectedSurah.endAyah));
    const finalStart = Math.min(s, e);
    const finalEnd = Math.max(s, e);

    onRangeStartChange(finalStart);
    onRangeEndChange(finalEnd);
    onStartRangeRepetition(finalStart, finalEnd, count, selectedSurah.surahNumber);
  };

  // Handle Surah Repeat
  const handleLaunchSurah = () => {
    let count = selectedSurahRepeat;
    if (isCustomSurah) {
      const parsed = parseInt(customSurahVal, 10);
      if (isNaN(parsed) || parsed <= 0) {
        alert('Please enter a valid positive number for repetition count (e.g. 5).');
        return;
      }
      count = Math.min(parsed, 1000);
    }
    onRepeatSurah(count);
  };

  // Handle Juz Repeat
  const handleLaunchJuz = () => {
    let count = selectedJuzRepeat;
    if (isCustomJuz) {
      const parsed = parseInt(customJuzVal, 10);
      if (isNaN(parsed) || parsed <= 0) {
        alert('Please enter a valid positive number for repetition count (e.g. 3).');
        return;
      }
      count = Math.min(parsed, 1000);
    }
    onRepeatJuz(count);
  };

  // Is any repetition actively running?
  const isRepetitionActive = isPlaying && playbackMode !== 'normal';

  // Surah display name for active badge
  const activeSurahName = selectedSurah?.surahEnglishName || '';

  return (
    <div className="control-toolbar">
      {/* Navigation tabs for Repetition modes */}
      <div className="toolbar-tabs">
        <button
          className={`toolbar-tab ${activeTab === 'range' ? 'active' : ''}`}
          onClick={() => setActiveTab('range')}
          id="tab-range-repetition"
        >
          <Repeat size={16} />
          <span>Range Repetition</span>
        </button>

        {viewMode === 'surah' ? (
          <button
            className={`toolbar-tab ${activeTab === 'surah' ? 'active' : ''}`}
            onClick={() => setActiveTab('surah')}
            id="tab-surah-repetition"
          >
            <RotateCcw size={16} />
            <span>Surah Repetition</span>
          </button>
        ) : (
          <button
            className={`toolbar-tab ${activeTab === 'juz' ? 'active' : ''}`}
            onClick={() => setActiveTab('juz')}
            id="tab-juz-repetition"
          >
            <RotateCcw size={16} />
            <span>Juz Repetition</span>
          </button>
        )}
      </div>

      {/* Active Repetition Status Notice */}
      {isRepetitionActive && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--primary-light)',
            border: '1px solid var(--primary)',
            borderRadius: 'var(--radius-md)',
            padding: '0.65rem 1rem',
            flexWrap: 'wrap',
            gap: '0.6rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span className="badge-tag">
              <Repeat size={14} />
              {playbackMode === 'ayah' && 'Ayah Repetition Active'}
              {playbackMode === 'range' && `Range: ${activeSurahName} ${rangeStart}–${rangeEnd}`}
              {playbackMode === 'surah' && 'Surah Repetition Active'}
              {playbackMode === 'juz' && 'Juz Repetition Active'}
            </span>
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
              Cycle: {currentCycle} / {repeatTarget === 'infinity' ? '∞' : repeatTarget}
            </span>
            {currentAyah && (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                • Current: {currentAyah.surahEnglishName || ''} Ayah {currentAyah.numberInSurah}
              </span>
            )}
          </div>

          <button
            className="action-btn"
            style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
            onClick={onStopPlayback}
            id="btn-stop-repetition"
          >
            <Square size={14} />
            <span>Stop Repetition</span>
          </button>
        </div>
      )}

      {/* Range Repetition Content */}
      {activeTab === 'range' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Juz Mode: Step 1 - List Available Surahs in this Juz */}
          {viewMode === 'juz' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <BookOpen size={15} color="var(--primary)" />
                  <span>Select Surah in Juz {currentJuz} for Range:</span>
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {surahsInJuz.length} {surahsInJuz.length === 1 ? 'Surah' : 'Surahs'} in this Juz
                </span>
              </div>

              {/* Search filter if Juz has multiple Surahs */}
              {surahsInJuz.length > 2 && (
                <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                  <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                  <input
                    type="text"
                    placeholder="Search Surahs in this Juz..."
                    value={surahFilterQuery}
                    onChange={e => setSurahFilterQuery(e.target.value)}
                    className="search-input-box"
                    style={{ paddingLeft: '2rem', paddingRight: '0.75rem', fontSize: '0.8rem', height: '32px' }}
                  />
                </div>
              )}

              {/* Surah List in this Juz */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '0.45rem',
                  maxHeight: '160px',
                  overflowY: 'auto'
                }}
              >
                {filteredSurahsInJuz.map(s => {
                  const isSelected = s.surahNumber === selectedSurah?.surahNumber;
                  return (
                    <button
                      key={s.surahNumber}
                      type="button"
                      onClick={() => handleSelectSurahInJuz(s)}
                      className={`surah-select-item ${isSelected ? 'selected' : ''}`}
                      style={{
                        padding: '0.5rem 0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'left'
                      }}
                    >
                      <div>
                        <div className="surah-item-title" style={{ fontSize: '0.85rem' }}>
                          {s.surahNumber}. {s.surahEnglishName}
                        </div>
                        <div className="surah-item-meta" style={{ fontSize: '0.725rem' }}>
                          Ayahs {s.startAyah}–{s.endAyah} ({s.totalInView} verses)
                        </div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-arabic)', fontSize: '1.15rem', color: 'var(--primary)' }}>
                        {s.surahName}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Configure Range for Selected Surah */}
          {selectedSurah && (
            <div
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}
            >
              {/* Selected Surah Header info */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    {selectedSurah.surahNumber}. {selectedSurah.surahEnglishName}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                    (Ayahs {selectedSurah.startAyah} to {selectedSurah.endAyah} available in {viewMode === 'juz' ? `Juz ${currentJuz}` : 'view'})
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--font-arabic)', fontSize: '1.2rem', color: 'var(--primary)' }}>
                  {selectedSurah.surahName}
                </div>
              </div>

              {/* Start and End Ayah Number Inputs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                {/* Start Ayah */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <label htmlFor="range-start-input" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Start Ayah:</label>
                  <input
                    id="range-start-input"
                    type="number"
                    min={selectedSurah.startAyah}
                    max={selectedSurah.endAyah}
                    value={rangeStart}
                    onChange={e => onRangeStartChange(parseInt(e.target.value, 10) || selectedSurah.startAyah)}
                    className="number-input"
                    style={{ width: '85px', textAlign: 'center', fontWeight: 600 }}
                  />
                </div>

                <ArrowRight size={16} color="var(--text-muted)" />

                {/* End Ayah */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <label htmlFor="range-end-input" style={{ fontSize: '0.85rem', fontWeight: 600 }}>End Ayah:</label>
                  <input
                    id="range-end-input"
                    type="number"
                    min={selectedSurah.startAyah}
                    max={selectedSurah.endAyah}
                    value={rangeEnd}
                    onChange={e => onRangeEndChange(parseInt(e.target.value, 10) || selectedSurah.endAyah)}
                    className="number-input"
                    style={{ width: '85px', textAlign: 'center', fontWeight: 600 }}
                  />
                </div>

                {/* Quick Range Helper buttons */}
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    type="button"
                    className="preset-chip"
                    onClick={() => {
                      onRangeStartChange(selectedSurah.startAyah);
                      onRangeEndChange(Math.min(selectedSurah.endAyah, selectedSurah.startAyah + 4));
                    }}
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                  >
                    First 5
                  </button>
                  <button
                    type="button"
                    className="preset-chip"
                    onClick={() => {
                      onRangeStartChange(selectedSurah.startAyah);
                      onRangeEndChange(selectedSurah.endAyah);
                    }}
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                  >
                    All {selectedSurah.totalInView}
                  </button>
                </div>
              </div>

              {/* Repeat Count Options */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Repeat Count:</span>
                <div className="preset-group">
                  {REPEAT_PRESETS.map(preset => {
                    const label = preset === 'infinity' ? '∞' : `${preset}×`;
                    const isActive = !isCustomRange && selectedRangeRepeat === preset;
                    return (
                      <button
                        key={preset}
                        className={`preset-chip ${isActive ? 'active' : ''}`}
                        onClick={() => handleRangePresetClick(preset)}
                        id={`range-preset-${preset}`}
                      >
                        {label}
                      </button>
                    );
                  })}

                  {/* Custom Preset */}
                  <button
                    className={`preset-chip ${isCustomRange ? 'active' : ''}`}
                    onClick={() => handleRangePresetClick('custom')}
                    id="range-preset-custom"
                  >
                    Custom
                  </button>

                  {isCustomRange && (
                    <div className="custom-input-wrap">
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        placeholder="e.g. 25"
                        value={customRangeVal}
                        onChange={handleCustomRangeChange}
                        className="number-input"
                        autoFocus
                        id="range-custom-number-input"
                      />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>times</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Range Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '0.25rem' }}>
                <button
                  className="action-btn primary"
                  onClick={handleLaunchRange}
                  id="btn-start-range"
                  style={{ fontWeight: 600, padding: '0.6rem 1.25rem' }}
                >
                  <Play size={16} />
                  <span>
                    ▶ Start Range ({selectedSurah.surahEnglishName} Ayahs {rangeStart}–{rangeEnd} • {selectedRangeRepeat === 'infinity' ? '∞' : `${selectedRangeRepeat}×`})
                  </span>
                </button>

                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Tip: You can also click "Set Start" or "Set End" on any Ayah card below.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Surah Repetition Content */}
      {activeTab === 'surah' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Repeat all {ayahsCount} Ayahs of the current Surah from beginning to end.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Surah Repeat Count:</span>
            <div className="preset-group">
              {REPEAT_PRESETS.map(preset => {
                const label = preset === 'infinity' ? '∞' : `${preset}×`;
                const isActive = !isCustomSurah && selectedSurahRepeat === preset;
                return (
                  <button
                    key={preset}
                    className={`preset-chip ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setIsCustomSurah(false);
                      setSelectedSurahRepeat(preset);
                    }}
                    id={`surah-preset-${preset}`}
                  >
                    {label}
                  </button>
                );
              })}

              <button
                className={`preset-chip ${isCustomSurah ? 'active' : ''}`}
                onClick={() => setIsCustomSurah(true)}
                id="surah-preset-custom"
              >
                Custom
              </button>

              {isCustomSurah && (
                <div className="custom-input-wrap">
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    placeholder="e.g. 5"
                    value={customSurahVal}
                    onChange={e => {
                      setCustomSurahVal(e.target.value);
                      const num = parseInt(e.target.value, 10);
                      if (!isNaN(num) && num > 0) setSelectedSurahRepeat(num);
                    }}
                    className="number-input"
                    autoFocus
                    id="surah-custom-number-input"
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>times</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <button
              className="action-btn primary"
              onClick={handleLaunchSurah}
              id="btn-start-surah-repeat"
            >
              <RotateCcw size={16} />
              <span>🔁 Repeat Surah ({selectedSurahRepeat === 'infinity' ? '∞' : `${selectedSurahRepeat}×`})</span>
            </button>
          </div>
        </div>
      )}

      {/* Juz Repetition Content */}
      {activeTab === 'juz' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Repeat all {ayahsCount} Ayahs of the current Juz sequentially.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Juz Repeat Count:</span>
            <div className="preset-group">
              {REPEAT_PRESETS.map(preset => {
                const label = preset === 'infinity' ? '∞' : `${preset}×`;
                const isActive = !isCustomJuz && selectedJuzRepeat === preset;
                return (
                  <button
                    key={preset}
                    className={`preset-chip ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setIsCustomJuz(false);
                      setSelectedJuzRepeat(preset);
                    }}
                    id={`juz-preset-${preset}`}
                  >
                    {label}
                  </button>
                );
              })}

              <button
                className={`preset-chip ${isCustomJuz ? 'active' : ''}`}
                onClick={() => setIsCustomJuz(true)}
                id="juz-preset-custom"
              >
                Custom
              </button>

              {isCustomJuz && (
                <div className="custom-input-wrap">
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    placeholder="e.g. 3"
                    value={customJuzVal}
                    onChange={e => {
                      setCustomJuzVal(e.target.value);
                      const num = parseInt(e.target.value, 10);
                      if (!isNaN(num) && num > 0) setSelectedJuzRepeat(num);
                    }}
                    className="number-input"
                    autoFocus
                    id="juz-custom-number-input"
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>times</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <button
              className="action-btn primary"
              onClick={handleLaunchJuz}
              id="btn-start-juz-repeat"
            >
              <RotateCcw size={16} />
              <span>🔁 Repeat Juz ({selectedJuzRepeat === 'infinity' ? '∞' : `${selectedJuzRepeat}×`})</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
