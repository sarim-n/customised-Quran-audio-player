import React from 'react';
import { X, Layers, Check } from 'lucide-react';
import { INDOPAK_JUZ_METADATA, MADANI_JUZ_METADATA, SURAHS } from '../data/quranMeta';

export function JuzModal({
  isOpen,
  onClose,
  currentJuzNumber,
  onSelectJuz,
  juzConvention = 'indopak',
  onChangeJuzConvention
}) {
  if (!isOpen) return null;

  const currentList = juzConvention === 'indopak' ? INDOPAK_JUZ_METADATA : MADANI_JUZ_METADATA;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Select Juz / Para (1–30)</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Choose your preferred division standard
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Convention Switcher */}
          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-subtle)', padding: '0.3rem', borderRadius: 'var(--radius-md)' }}>
            <button
              className={`preset-chip ${juzConvention === 'indopak' ? 'active' : ''}`}
              style={{ flex: 1, textAlign: 'center' }}
              onClick={() => onChangeJuzConvention('indopak')}
              id="btn-convention-indopak"
            >
              Indo-Pak (Subcontinent Standard)
            </button>
            <button
              className={`preset-chip ${juzConvention === 'madani' ? 'active' : ''}`}
              style={{ flex: 1, textAlign: 'center' }}
              onClick={() => onChangeJuzConvention('madani')}
              id="btn-convention-madani"
            >
              Madani (Uthmani Standard)
            </button>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', textAlign: 'center' }}>
            {juzConvention === 'indopak'
              ? 'Indo-Pak: Para 7 starts at 5:83 (وَإِذَا سَمِعُوا), Para 4 at 3:92 (لَنْ تَنَالُوا)'
              : 'Madani: Juz 7 starts at 5:82, Juz 4 at 3:93 (Al Quran Cloud API default)'}
          </div>

          {/* List of 30 Paras */}
          <div className="modal-list-grid">
            {currentList.map(item => {
              const juzNum = item.id;
              const isSelected = juzNum === currentJuzNumber;
              const startSurah = SURAHS.find(s => s.number === item.surah);

              return (
                <button
                  key={juzNum}
                  className={`surah-select-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    onSelectJuz(juzNum);
                    onClose();
                  }}
                  id={`juz-item-${juzNum}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span className="ayah-badge" style={{ minWidth: '34px', justifyContent: 'center' }}>
                      {juzNum}
                    </span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        {item.transliteration}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Starts {startSurah?.englishName || `Surah ${item.surah}`}:{item.ayah}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-arabic)', fontSize: '1.25rem', color: 'var(--primary)' }}>
                    {item.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
