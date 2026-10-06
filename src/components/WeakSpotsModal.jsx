import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  RotateCcw,
  Trash2,
  X,
  Target,
  Search,
  CheckCircle2,
  Plus,
  Flame,
  BookOpen,
  Play
} from 'lucide-react';
import {
  getWeakSpots,
  markMistake,
  removeWeakSpot,
  clearAllWeakSpots,
  decrementMistake
} from '../services/weakSpotsStorage';

export function WeakSpotsModal({
  isOpen,
  onClose,
  onReviseTriplet,
  onJumpToAyah,
  onShowToast
}) {
  const [weakSpots, setWeakSpots] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  // Load weak spots list and listen for updates
  const refreshList = () => {
    setWeakSpots(getWeakSpots());
  };

  useEffect(() => {
    if (!isOpen) return;
    refreshList();

    const handleUpdate = () => refreshList();
    window.addEventListener('quran-weak-spots-updated', handleUpdate);
    return () => window.removeEventListener('quran-weak-spots-updated', handleUpdate);
  }, [isOpen]);

  // Compute total statistics
  const totalMistakesCount = useMemo(() => {
    return weakSpots.reduce((acc, curr) => acc + (curr.mistakeCount || 1), 0);
  }, [weakSpots]);

  // Filter list by search query
  const filteredWeakSpots = useMemo(() => {
    if (!searchQuery.trim()) return weakSpots;
    const q = searchQuery.toLowerCase().trim();
    return weakSpots.filter(item =>
      item.surahEnglishName.toLowerCase().includes(q) ||
      item.surahNumber.toString() === q ||
      item.numberInSurah.toString() === q ||
      `${item.surahNumber}:${item.numberInSurah}`.includes(q) ||
      (item.translation && item.translation.toLowerCase().includes(q))
    );
  }, [weakSpots, searchQuery]);

  if (!isOpen) return null;

  const handleClearAll = () => {
    if (!confirmClearAll) {
      setConfirmClearAll(true);
      setTimeout(() => setConfirmClearAll(false), 4000);
      return;
    }
    clearAllWeakSpots();
    setConfirmClearAll(false);
    refreshList();
    if (onShowToast) onShowToast('All weak spot records cleared.');
  };

  const handleIncrement = (item) => {
    markMistake(item);
    refreshList();
    if (onShowToast) {
      onShowToast(`Increased mistake count for Surah ${item.surahEnglishName} Ayah ${item.numberInSurah}.`);
    }
  };

  const handleDecrement = (item) => {
    decrementMistake(item.surahNumber, item.numberInSurah);
    refreshList();
  };

  const handleRemove = (item) => {
    removeWeakSpot(item.surahNumber, item.numberInSurah);
    refreshList();
    if (onShowToast) {
      onShowToast(`Removed Surah ${item.surahEnglishName} Ayah ${item.numberInSurah} from weak spots.`);
    }
  };

  const formatRelativeDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 2) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="modal-backdrop" onClick={onClose} id="weak-spots-modal-backdrop">
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '680px', width: '92%' }}
        id="weak-spots-modal-container"
      >
        {/* Header */}
        <div className="modal-header" style={{ paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Flame size={20} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.2rem', margin: 0 }}>
                Weak Spots & Revision
              </h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                Track & revise your frequently missed ayahs
              </div>
            </div>
          </div>

          <button className="icon-btn" onClick={onClose} title="Close Modal" id="btn-close-weak-spots-modal">
            <X size={20} />
          </button>
        </div>

        {/* Stats & Search Bar */}
        <div style={{ padding: '0 1rem 0.75rem 1rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              marginBottom: '0.75rem'
            }}
          >
            {/* Stats Pills */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  padding: '0.3rem 0.65rem',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <BookOpen size={13} color="var(--primary)" />
                {weakSpots.length} Weak {weakSpots.length === 1 ? 'Ayah' : 'Ayahs'}
              </span>

              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  padding: '0.3rem 0.65rem',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Flame size={13} />
                {totalMistakesCount} Total {totalMistakesCount === 1 ? 'Mistake' : 'Mistakes'}
              </span>
            </div>

            {/* Clear All Action */}
            {weakSpots.length > 0 && (
              <button
                className="action-btn danger"
                onClick={handleClearAll}
                title="Clear all recorded weak spots"
                id="btn-clear-all-weak-spots"
                style={{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.6rem',
                  borderColor: confirmClearAll ? 'red' : undefined,
                  background: confirmClearAll ? 'rgba(239, 68, 68, 0.2)' : undefined
                }}
              >
                <Trash2 size={13} />
                <span>{confirmClearAll ? 'Confirm Clear All?' : 'Clear All'}</span>
              </button>
            )}
          </div>

          {/* Search Box */}
          {weakSpots.length > 0 && (
            <div style={{ position: 'relative' }}>
              <Search
                size={15}
                style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
              <input
                type="text"
                placeholder="Search by Surah name, Ayah number, or text..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.75rem 0.45rem 2.2rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem'
                }}
                id="input-search-weak-spots"
              />
            </div>
          )}
        </div>

        {/* Weak Spots List Body */}
        <div className="modal-body" style={{ maxHeight: '420px', overflowY: 'auto', padding: '0.75rem 1rem' }}>
          {weakSpots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={42} color="var(--primary)" style={{ opacity: 0.8, marginBottom: '0.75rem' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                No Weak Spots Tracked Yet!
              </h3>
              <p style={{ fontSize: '0.85rem', maxWidth: '380px', margin: '0 auto', lineHeight: 1.5 }}>
                While reciting or revising, tap <strong>"Mark Mistake"</strong> on any Ayah card or in the player bar to add it here.
              </p>
            </div>
          ) : filteredWeakSpots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              No weak spots matching "{searchQuery}"
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredWeakSpots.map((spot) => (
                <div
                  key={spot.id}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                  id={`weak-spot-card-${spot.surahNumber}-${spot.numberInSurah}`}
                >
                  {/* Top Bar: Surah info + Mistake badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          color: 'var(--primary)'
                        }}
                      >
                        Surah {spot.surahNumber}. {spot.surahEnglishName}
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.15rem 0.45rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-subtle)',
                          color: 'var(--text-muted)',
                          fontWeight: 600
                        }}
                      >
                        Ayah {spot.numberInSurah} {spot.juzNumber ? `(Juz ${spot.juzNumber})` : ''}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#ef4444',
                          background: 'rgba(239, 68, 68, 0.12)',
                          padding: '0.2rem 0.55rem',
                          borderRadius: 'var(--radius-full)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                        title={`Recorded ${spot.mistakeCount} mistakes`}
                      >
                        <Flame size={12} />
                        {spot.mistakeCount} {spot.mistakeCount === 1 ? 'Mistake' : 'Mistakes'}
                      </span>

                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {formatRelativeDate(spot.lastMarked)}
                      </span>
                    </div>
                  </div>

                  {/* Arabic Text Snippet */}
                  {spot.text && (
                    <div
                      className="arabic-quran-text"
                      style={{
                        fontSize: '1.25rem',
                        lineHeight: 1.8,
                        textAlign: 'right',
                        padding: '0.25rem 0',
                        color: 'var(--text-main)'
                      }}
                    >
                      {spot.text}
                    </div>
                  )}

                  {/* English Translation Snippet */}
                  {spot.translation && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.4 }}>
                      {spot.translation}
                    </div>
                  )}

                  {/* Action Bar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                      marginTop: '0.35rem',
                      paddingTop: '0.4rem',
                      borderTop: '1px solid var(--border-subtle)',
                      flexWrap: 'wrap'
                    }}
                  >
                    {/* Primary Triplet Revision Action */}
                    <button
                      className="action-btn primary"
                      onClick={() => {
                        onClose();
                        if (onReviseTriplet) onReviseTriplet(spot);
                      }}
                      title="Play triplet: Previous Ayah → Weak Ayah → Next Ayah, repeated"
                      id={`btn-revise-triplet-${spot.surahNumber}-${spot.numberInSurah}`}
                      style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem' }}
                    >
                      <RotateCcw size={13} />
                      <span>Revise Triplet (Prev → Weak → Next)</span>
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {/* Jump to Ayah button */}
                      <button
                        className="action-btn"
                        onClick={() => {
                          onClose();
                          if (onJumpToAyah) onJumpToAyah(spot);
                        }}
                        title="Jump to this Ayah in main view"
                        id={`btn-jump-weak-spot-${spot.surahNumber}-${spot.numberInSurah}`}
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem' }}
                      >
                        <Target size={13} />
                        <span>Go to Ayah</span>
                      </button>

                      {/* Increment +1 button */}
                      <button
                        className="action-btn"
                        onClick={() => handleIncrement(spot)}
                        title="Increment mistake count (+1)"
                        id={`btn-inc-mistake-${spot.surahNumber}-${spot.numberInSurah}`}
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem' }}
                      >
                        <Plus size={13} />
                        <span>+1</span>
                      </button>

                      {/* Remove button */}
                      <button
                        className="action-btn danger"
                        onClick={() => handleRemove(spot)}
                        title="Remove from weak spots"
                        id={`btn-remove-weak-spot-${spot.surahNumber}-${spot.numberInSurah}`}
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Triplet revision loops 3 ayahs for optimal memorization reinforcement.
          </div>
          <button className="action-btn" onClick={onClose} id="btn-done-weak-spots">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
