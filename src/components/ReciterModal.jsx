import React from 'react';
import { X, Check } from 'lucide-react';
import { RECITERS } from '../data/quranMeta';

export function ReciterModal({ isOpen, onClose, currentReciter, onSelectReciter }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Select Reciter (Qari)</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {RECITERS.map(r => {
              const isSelected = r.id === currentReciter?.id;
              return (
                <button
                  key={r.id}
                  className={`surah-select-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    onSelectReciter(r);
                    onClose();
                  }}
                  id={`reciter-item-${r.id}`}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{r.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.subtext}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontFamily: 'var(--font-arabic)', fontSize: '1.25rem', color: 'var(--primary)' }}>
                      {r.arabicName}
                    </span>
                    {isSelected && <Check size={18} color="var(--primary)" />}
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
