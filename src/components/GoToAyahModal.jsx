import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Search, Target, ArrowRight, ArrowLeft, BookOpen, Layers } from 'lucide-react';
import { SURAHS } from '../data/quranMeta';

export function GoToAyahModal({
  isOpen,
  onClose,
  ayahs = [],
  viewMode = 'surah',
  currentSurah,
  currentJuz,
  onJumpToTarget
}) {
  const [surahSearch, setSurahSearch] = useState('');
  const [selectedSurahNumber, setSelectedSurahNumber] = useState(null);
  const [ayahNumberInput, setAyahNumberInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);

  // Group ayahs in current view by surah
  const surahsInView = useMemo(() => {
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
          totalInView: 1,
          ayahsInView: [a]
        });
      } else {
        const item = map.get(sNum);
        item.endAyah = Math.max(item.endAyah, a.numberInSurah);
        item.startAyah = Math.min(item.startAyah, a.numberInSurah);
        item.totalInView += 1;
        item.ayahsInView.push(a);
      }
    });
    return Array.from(map.values());
  }, [ayahs]);

  // When modal opens:
  // If only 1 Surah in view (e.g. Surah mode or single-Surah Juz), select it immediately.
  // If multiple Surahs (e.g. Juz with 2+ Surahs), start in list view so user can search & pick a Surah.
  useEffect(() => {
    if (isOpen) {
      setSurahSearch('');
      setAyahNumberInput('');
      setErrorMsg('');
      if (surahsInView.length === 1) {
        setSelectedSurahNumber(surahsInView[0].surahNumber);
      } else {
        setSelectedSurahNumber(null);
      }
    }
  }, [isOpen, surahsInView]);

  // Autofocus input whenever a surah is selected
  useEffect(() => {
    if (selectedSurahNumber !== null && isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [selectedSurahNumber, isOpen]);

  // Filtered surahs by search
  const filteredSurahs = useMemo(() => {
    if (!surahSearch.trim()) return surahsInView;
    const q = surahSearch.toLowerCase().trim();
    return surahsInView.filter(s =>
      s.surahNumber.toString() === q ||
      s.surahEnglishName.toLowerCase().includes(q) ||
      (s.englishNameTranslation && s.englishNameTranslation.toLowerCase().includes(q)) ||
      s.surahName.includes(q)
    );
  }, [surahsInView, surahSearch]);

  const selectedSurah = useMemo(() => {
    if (selectedSurahNumber === null) return null;
    return surahsInView.find(s => s.surahNumber === selectedSurahNumber) || null;
  }, [surahsInView, selectedSurahNumber]);

  if (!isOpen) return null;

  // Jump handler when submitting typed ayah number
  const handleJump = (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const num = parseInt(ayahNumberInput.trim(), 10);
    if (isNaN(num) || num <= 0) {
      setErrorMsg('Please enter a valid positive Ayah number.');
      return;
    }

    if (!selectedSurah) {
      setErrorMsg('Please select a Surah first.');
      return;
    }

    if (num < selectedSurah.startAyah || num > selectedSurah.endAyah) {
      setErrorMsg(
        `Ayah ${num} is outside available verses in this view (${selectedSurah.startAyah} to ${selectedSurah.endAyah}). Total Ayahs in Surah: ${selectedSurah.totalAyahsInSurah}.`
      );
      return;
    }

    // Find the matching Ayah object
    const target = ayahs.find(
      a => a.surahNumber === selectedSurah.surahNumber && a.numberInSurah === num
    );
    if (!target) {
      setErrorMsg(`Ayah ${num} not found in ${selectedSurah.surahEnglishName}.`);
      return;
    }

    onJumpToTarget(target);
    onClose();
  };

  // Direct click on an ayah chip
  const handleDirectAyahClick = (ayahObj) => {
    onJumpToTarget(ayahObj);
    onClose();
  };

  const parsedInput = parseInt(ayahNumberInput.trim(), 10);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '520px', width: '92%' }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Target size={20} color="var(--primary)" />
            <div>
              <div className="modal-title">Go to Ayah</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {viewMode === 'juz'
                  ? `Juz ${currentJuz} (${surahsInView.length} ${surahsInView.length === 1 ? 'Surah' : 'Surahs'})`
                  : currentSurah?.englishName}
              </div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ gap: '1rem' }}>
          {/* VIEW A: Surah Selection View (shown when multiple surahs in Juz and none selected) */}
          {selectedSurahNumber === null && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  Select Surah in Juz {currentJuz}:
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {filteredSurahs.length} of {surahsInView.length} Surahs
                </span>
              </div>

              {/* Search Option for List of Surahs */}
              <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-subtle)'
                  }}
                />
                <input
                  type="text"
                  placeholder="Search Surah name or number (e.g. Maaida, 5)..."
                  value={surahSearch}
                  onChange={e => setSurahSearch(e.target.value)}
                  className="search-input-box"
                  style={{
                    paddingLeft: '2.2rem',
                    paddingRight: surahSearch ? '2rem' : '0.75rem',
                    fontSize: '0.85rem'
                  }}
                  autoFocus
                />
                {surahSearch && (
                  <button
                    type="button"
                    onClick={() => setSurahSearch('')}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-subtle)',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* List of Surahs in this Juz */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  maxHeight: '280px',
                  overflowY: 'auto',
                  paddingRight: '2px'
                }}
              >
                {filteredSurahs.map(s => (
                  <button
                    key={s.surahNumber}
                    type="button"
                    className="surah-select-item"
                    onClick={() => {
                      setSelectedSurahNumber(s.surahNumber);
                      setAyahNumberInput('');
                      setErrorMsg('');
                    }}
                    style={{
                      padding: '0.75rem 0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderRadius: 'var(--radius-md)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.925rem', color: 'var(--text-main)' }}>
                        {s.surahNumber}. {s.surahEnglishName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Total: <strong>{s.totalAyahsInSurah} Ayahs</strong> • In this Juz: Ayahs {s.startAyah}–{s.endAyah} ({s.totalInView} verses)
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-arabic)',
                        fontSize: '1.3rem',
                        color: 'var(--primary)',
                        paddingLeft: '0.75rem'
                      }}
                    >
                      {s.surahName}
                    </div>
                  </button>
                ))}

                {filteredSurahs.length === 0 && (
                  <div
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-muted)',
                      textAlign: 'center',
                      padding: '2rem 1rem'
                    }}
                  >
                    No Surah found matching "{surahSearch}"
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW B: Selected Surah Detail & Ayah Input + List */}
          {selectedSurah && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {/* Back button or Surah switcher row if multiple surahs in view */}
              {surahsInView.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSurahNumber(null);
                      setAyahNumberInput('');
                      setErrorMsg('');
                    }}
                    className="action-btn"
                    style={{
                      fontSize: '0.775rem',
                      padding: '0.3rem 0.6rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <ArrowLeft size={13} />
                    <span>Back to Surahs in Juz {currentJuz}</span>
                  </button>

                  {/* Quick pills to switch between Surahs */}
                  <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto' }}>
                    {surahsInView.map(s => {
                      const isActive = s.surahNumber === selectedSurah.surahNumber;
                      return (
                        <button
                          key={s.surahNumber}
                          type="button"
                          onClick={() => {
                            setSelectedSurahNumber(s.surahNumber);
                            setAyahNumberInput('');
                            setErrorMsg('');
                          }}
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.25rem 0.55rem',
                            borderRadius: 'var(--radius-sm)',
                            border: isActive ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                            background: isActive ? 'var(--primary-light)' : 'var(--bg-subtle)',
                            color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {s.surahNumber}. {s.surahEnglishName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Selected Surah Summary Header */}
              <div
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <BookOpen size={16} color="var(--primary)" />
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      {selectedSurah.surahNumber}. {selectedSurah.surahEnglishName}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                    Total in Surah: <strong style={{ color: 'var(--text-main)' }}>{selectedSurah.totalAyahsInSurah} Ayahs</strong>
                    {selectedSurah.totalInView < selectedSurah.totalAyahsInSurah && (
                      <span> • In this Juz: <strong>Ayahs {selectedSurah.startAyah} to {selectedSurah.endAyah}</strong> ({selectedSurah.totalInView} verses)</span>
                    )}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-arabic)',
                    fontSize: '1.4rem',
                    color: 'var(--primary)'
                  }}
                >
                  {selectedSurah.surahName}
                </div>
              </div>

              {/* Input Form to Type Ayah Number */}
              <form onSubmit={handleJump} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label
                  htmlFor="modal-ayah-number-input"
                  style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  Type Ayah Number in {selectedSurah.surahEnglishName}:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    ref={inputRef}
                    id="modal-ayah-number-input"
                    type="number"
                    min={selectedSurah.startAyah}
                    max={selectedSurah.endAyah}
                    placeholder={`e.g. ${selectedSurah.startAyah} to ${selectedSurah.endAyah}`}
                    value={ayahNumberInput}
                    onChange={e => {
                      setAyahNumberInput(e.target.value);
                      setErrorMsg('');
                    }}
                    className="number-input"
                    style={{
                      flex: 1,
                      textAlign: 'left',
                      padding: '0.6rem 0.8rem',
                      fontSize: '1rem',
                      borderRadius: 'var(--radius-md)'
                    }}
                  />
                  <button
                    type="submit"
                    className="action-btn primary"
                    style={{ padding: '0.6rem 1.25rem', whiteSpace: 'nowrap', fontWeight: 600 }}
                    id="modal-btn-jump-ayah"
                  >
                    <span>Go to Ayah</span>
                    <ArrowRight size={15} />
                  </button>
                </div>

                {/* Validation Error Message */}
                {errorMsg && (
                  <div
                    style={{
                      color: 'var(--danger)',
                      fontSize: '0.8rem',
                      padding: '0.45rem 0.7rem',
                      background: 'var(--danger-light)',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    {errorMsg}
                  </div>
                )}
              </form>

              {/* List of Total Ayahs in this Surah / View */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.4rem'
                  }}
                >
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    List of Ayahs ({selectedSurah.totalInView} verses):
                  </span>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-subtle)' }}>
                    Click any Ayah to jump directly
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(42px, 1fr))',
                    gap: '0.35rem',
                    maxHeight: '160px',
                    overflowY: 'auto',
                    padding: '0.4rem',
                    background: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  {selectedSurah.ayahsInView.map(a => {
                    const isTyped = parsedInput === a.numberInSurah;
                    return (
                      <button
                        key={a.number}
                        type="button"
                        onClick={() => handleDirectAyahClick(a)}
                        title={`Go to ${selectedSurah.surahEnglishName} Ayah ${a.numberInSurah}`}
                        style={{
                          padding: '0.4rem 0.2rem',
                          borderRadius: 'var(--radius-sm)',
                          border: isTyped ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                          background: isTyped ? 'var(--primary)' : 'var(--bg-surface)',
                          color: isTyped ? 'white' : 'var(--text-main)',
                          fontSize: '0.8rem',
                          fontWeight: isTyped ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.12s ease',
                          textAlign: 'center'
                        }}
                      >
                        {a.numberInSurah}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
