import React, { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { SURAHS } from '../data/quranMeta';

export function SurahModal({ isOpen, onClose, currentSurahNumber, onSelectSurah }) {
  const [search, setSearch] = useState('');

  const filteredSurahs = useMemo(() => {
    if (!search.trim()) return SURAHS;
    const q = search.toLowerCase().trim();
    return SURAHS.filter(s =>
      s.number.toString() === q ||
      s.englishName.toLowerCase().includes(q) ||
      s.englishNameTranslation.toLowerCase().includes(q) ||
      s.name.includes(q)
    );
  }, [search]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Select Surah (1–114)</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="search-input-box"
              placeholder="Search by name, Arabic, or number (e.g. Baqarah, 2, الفاتحة)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              id="surah-search-input"
            />
          </div>

          {/* Surahs Grid */}
          <div className="modal-list-grid">
            {filteredSurahs.map(surah => {
              const isSelected = surah.number === currentSurahNumber;
              return (
                <button
                  key={surah.number}
                  className={`surah-select-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    onSelectSurah(surah.number);
                    onClose();
                  }}
                  id={`surah-item-${surah.number}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span className="ayah-badge" style={{ minWidth: '32px', justifyContent: 'center' }}>
                      {surah.number}
                    </span>
                    <div>
                      <div className="surah-item-title">{surah.englishName}</div>
                      <div className="surah-item-meta">
                        {surah.numberOfAyahs} Ayahs • {surah.revelationType}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-arabic)', fontSize: '1.25rem', color: 'var(--primary)' }}>
                    {surah.name}
                  </div>
                </button>
              );
            })}
          </div>

          {filteredSurahs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              No Surahs found matching "{search}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
