import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  DownloadCloud,
  CheckCircle2,
  Trash2,
  Search,
  HardDrive,
  Wifi,
  WifiOff,
  Loader2,
  BookOpen,
  Layers,
  AlertCircle
} from 'lucide-react';
import { SURAHS } from '../data/quranMeta';
import {
  getOfflineIndex,
  isItemDownloaded,
  downloadSurah,
  downloadJuz,
  downloadAllSurahs,
  deleteOfflineItem,
  formatBytes,
  getStorageEstimate,
  getOfflineKey
} from '../services/offlineStorage';

export function OfflineModal({
  isOpen,
  onClose,
  viewMode,
  currentSurah,
  currentJuz,
  juzConvention,
  reciter,
  onShowToast
}) {
  const [offlineIndex, setOfflineIndex] = useState(getOfflineIndex);
  const [activeTab, setActiveTab] = useState('current'); // 'current' | 'surahs' | 'juz' | 'downloaded'
  const [searchQuery, setSearchQuery] = useState('');
  const [storageInfo, setStorageInfo] = useState(null);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  // Active Download State
  const [activeDownloadKey, setActiveDownloadKey] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(null); // { current, total, percentage, ayahNumber, title }
  const [abortController, setAbortController] = useState(null);

  // Sync online/offline window state
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleIndexUpdate = (e) => {
      setOfflineIndex(e.detail || getOfflineIndex());
      refreshStorage();
    };
    window.addEventListener('quran-offline-index-updated', handleIndexUpdate);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('quran-offline-index-updated', handleIndexUpdate);
    };
  }, []);

  const refreshStorage = () => {
    getStorageEstimate().then(setStorageInfo);
  };

  useEffect(() => {
    if (isOpen) {
      setOfflineIndex(getOfflineIndex());
      refreshStorage();
    }
  }, [isOpen]);

  // Current item info
  const reciterId = reciter?.id || 'ar.alafasy';
  const currentItemType = viewMode === 'juz' ? 'juz' : 'surah';
  const currentItemId = viewMode === 'juz' ? currentJuz : currentSurah?.number || 1;
  const currentKey = getOfflineKey(currentItemType, currentItemId, reciterId);
  const isCurrentDownloaded = Boolean(offlineIndex[currentKey]?.isComplete);

  // Handle Download for a specific Surah
  const handleDownloadSurah = async (surahNumber) => {
    if (activeDownloadKey) {
      if (onShowToast) onShowToast('A download is already in progress.');
      return;
    }

    const sMeta = SURAHS.find(s => s.number === surahNumber);
    const sName = sMeta?.englishName || `Surah ${surahNumber}`;
    const key = getOfflineKey('surah', surahNumber, reciterId);

    const controller = new AbortController();
    setAbortController(controller);
    setActiveDownloadKey(key);
    setDownloadProgress({ current: 0, total: sMeta?.numberOfAyahs || 7, percentage: 0, title: sName });

    try {
      await downloadSurah(
        surahNumber,
        reciter,
        (p) => {
          setDownloadProgress({ ...p, title: sName });
        },
        controller.signal
      );
      setOfflineIndex(getOfflineIndex());
      refreshStorage();
      if (onShowToast) onShowToast(`✓ ${sName} downloaded for offline playback!`);
    } catch (err) {
      if (err.name !== 'AbortError' && !err.message.includes('cancelled')) {
        console.error('Download error:', err);
        alert(`Failed to download ${sName}: ${err.message}`);
      }
    } finally {
      setActiveDownloadKey(null);
      setDownloadProgress(null);
      setAbortController(null);
    }
  };

  // Handle Download for a specific Juz
  const handleDownloadJuz = async (juzNumber) => {
    if (activeDownloadKey) {
      if (onShowToast) onShowToast('A download is already in progress.');
      return;
    }

    const jName = `Juz ${juzNumber}`;
    const key = getOfflineKey('juz', juzNumber, reciterId);

    const controller = new AbortController();
    setAbortController(controller);
    setActiveDownloadKey(key);
    setDownloadProgress({ current: 0, total: 100, percentage: 0, title: jName });

    try {
      await downloadJuz(
        juzNumber,
        juzConvention,
        reciter,
        (p) => {
          setDownloadProgress({ ...p, title: jName });
        },
        controller.signal
      );
      setOfflineIndex(getOfflineIndex());
      refreshStorage();
      if (onShowToast) onShowToast(`✓ ${jName} downloaded for offline playback!`);
    } catch (err) {
      if (err.name !== 'AbortError' && !err.message.includes('cancelled')) {
        console.error('Download error:', err);
        alert(`Failed to download ${jName}: ${err.message}`);
      }
    } finally {
      setActiveDownloadKey(null);
      setDownloadProgress(null);
      setAbortController(null);
    }
  };

  // Handle Download for All 114 Surahs (Complete Quran) with 1-click
  const handleDownloadAll = async () => {
    if (activeDownloadKey) {
      if (onShowToast) onShowToast('A download is already in progress.');
      return;
    }

    const controller = new AbortController();
    setAbortController(controller);
    setActiveDownloadKey('all_surahs');
    setDownloadProgress({ current: 0, total: 114, percentage: 0, title: 'Complete Quran (All 114 Surahs)' });

    try {
      await downloadAllSurahs(
        reciter,
        (p) => {
          setDownloadProgress({
            current: p.currentSurah,
            total: p.totalSurahs,
            percentage: p.percentage,
            title: `Surah ${p.currentSurah} of 114 (${p.surahName})`,
            subtitle: `Ayah ${p.ayahCurrent || 0} / ${p.ayahTotal || 0} • Overall ${p.currentAyahGlobal || 0} / 6,236 Ayahs`
          });
        },
        controller.signal
      );
      setOfflineIndex(getOfflineIndex());
      refreshStorage();
      if (onShowToast) onShowToast('✓ Complete Quran (All 114 Surahs) downloaded for offline playback!');
    } catch (err) {
      if (err.name !== 'AbortError' && !err.message.includes('cancelled')) {
        console.error('Download all error:', err);
        alert(`Download interrupted: ${err.message}`);
      }
    } finally {
      setActiveDownloadKey(null);
      setDownloadProgress(null);
      setAbortController(null);
    }
  };

  // Count how many of the 114 Surahs are fully downloaded
  const downloadedSurahCount = useMemo(() => {
    let count = 0;
    for (let i = 1; i <= 114; i++) {
      if (offlineIndex[getOfflineKey('surah', i, reciterId)]?.isComplete) {
        count++;
      }
    }
    return count;
  }, [offlineIndex, reciterId]);

  // Cancel in-progress download
  const handleCancelDownload = () => {
    if (abortController) {
      abortController.abort();
      setActiveDownloadKey(null);
      setDownloadProgress(null);
      setAbortController(null);
      if (onShowToast) onShowToast('Download cancelled.');
    }
  };

  // Delete an offline item
  const handleDeleteItem = async (key, name) => {
    if (window.confirm(`Remove offline recitation for ${name}?`)) {
      await deleteOfflineItem(key);
      setOfflineIndex(getOfflineIndex());
      refreshStorage();
      if (onShowToast) onShowToast(`Removed ${name} from offline storage.`);
    }
  };

  // Clear all offline audio
  const handleClearAll = async () => {
    const keys = Object.keys(offlineIndex);
    if (keys.length === 0) return;
    if (window.confirm(`Delete all ${keys.length} downloaded offline recitation(s)? This will free up device storage.`)) {
      for (const k of keys) {
        await deleteOfflineItem(k);
      }
      setOfflineIndex(getOfflineIndex());
      refreshStorage();
      if (onShowToast) onShowToast('All offline downloads removed.');
    }
  };

  // Filtered Surahs
  const filteredSurahs = useMemo(() => {
    if (!searchQuery.trim()) return SURAHS;
    const q = searchQuery.toLowerCase().trim();
    return SURAHS.filter(s =>
      s.number.toString().includes(q) ||
      s.englishName.toLowerCase().includes(q) ||
      s.name.includes(q) ||
      s.englishNameTranslation.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Downloaded items list
  const downloadedItems = useMemo(() => {
    return Object.values(offlineIndex).filter(item => item.reciterId === reciterId);
  }, [offlineIndex, reciterId]);

  const totalDownloadedBytes = useMemo(() => {
    return downloadedItems.reduce((acc, item) => acc + (item.totalBytes || 0), 0);
  }, [downloadedItems]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} id="offline-modal-backdrop">
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '640px', width: '92%', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
        id="offline-modal-container"
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <DownloadCloud size={20} />
            </div>
            <div>
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Offline Recitation Manager
              </h2>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                {isOnline ? (
                  <span style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Wifi size={13} /> Online
                  </span>
                ) : (
                  <span style={{ color: 'var(--gold-text)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <WifiOff size={13} /> Offline Mode Active
                  </span>
                )}
                <span>•</span>
                <span>Reciter: <strong>{reciter?.name}</strong></span>
              </div>
            </div>
          </div>

          <button className="icon-btn" onClick={onClose} title="Close" id="offline-modal-close-btn">
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-subtle)',
            padding: '0.25rem 1rem 0'
          }}
        >
          <button
            className={`toolbar-tab ${activeTab === 'current' ? 'active' : ''}`}
            onClick={() => setActiveTab('current')}
            id="tab-offline-current"
            style={{ padding: '0.55rem 0.85rem', fontSize: '0.84rem' }}
          >
            Current Recitation
          </button>
          <button
            className={`toolbar-tab ${activeTab === 'surahs' ? 'active' : ''}`}
            onClick={() => setActiveTab('surahs')}
            id="tab-offline-surahs"
            style={{ padding: '0.55rem 0.85rem', fontSize: '0.84rem' }}
          >
            All 114 Surahs
          </button>
          <button
            className={`toolbar-tab ${activeTab === 'juz' ? 'active' : ''}`}
            onClick={() => setActiveTab('juz')}
            id="tab-offline-juz"
            style={{ padding: '0.55rem 0.85rem', fontSize: '0.84rem' }}
          >
            30 Juz
          </button>
          <button
            className={`toolbar-tab ${activeTab === 'downloaded' ? 'active' : ''}`}
            onClick={() => setActiveTab('downloaded')}
            id="tab-offline-downloaded"
            style={{ padding: '0.55rem 0.85rem', fontSize: '0.84rem' }}
          >
            Downloaded ({downloadedItems.length})
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Active Download Progress Card (if downloading) */}
          {downloadProgress && (
            <div
              style={{
                background: 'var(--primary-light)',
                border: '1.5px solid var(--primary)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Loader2 size={18} className="spin-animation" color="var(--primary)" />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    Downloading {downloadProgress.title}...
                  </span>
                </div>
                <button
                  className="action-btn danger"
                  onClick={handleCancelDownload}
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                >
                  Cancel
                </button>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  background: 'var(--bg-subtle)',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${downloadProgress.percentage}%`,
                    background: 'var(--primary)',
                    transition: 'width 0.2s ease'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>Ayah {downloadProgress.current} of {downloadProgress.total}</span>
                <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{downloadProgress.percentage}%</span>
              </div>
            </div>
          )}

          {/* TAB 1: Current Selection */}
          {activeTab === 'current' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Current View
                    </span>
                    <h3 style={{ margin: '0.2rem 0', fontSize: '1.2rem', fontWeight: 700 }}>
                      {viewMode === 'juz'
                        ? `Juz ${currentJuz}`
                        : `${currentSurah?.number}. ${currentSurah?.englishName}`}
                    </h3>
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                      {viewMode === 'juz'
                        ? `Full Juz • Standard: ${juzConvention === 'indopak' ? 'Indo-Pak' : 'Madani'}`
                        : `${currentSurah?.name} • ${currentSurah?.numberOfAyahs} Ayahs • ${currentSurah?.englishNameTranslation}`}
                    </div>
                  </div>

                  {isCurrentDownloaded ? (
                    <span className="badge-tag" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                      <CheckCircle2 size={14} /> Ready Offline
                    </span>
                  ) : (
                    <span className="badge-tag" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                      Not Downloaded
                    </span>
                  )}
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Reciter: <strong>{reciter?.name}</strong> • Audio: 128kbps MP3
                  </div>

                  {isCurrentDownloaded ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="action-btn danger"
                        onClick={() => handleDeleteItem(currentKey, viewMode === 'juz' ? `Juz ${currentJuz}` : currentSurah?.englishName)}
                        title="Delete from offline storage"
                      >
                        <Trash2 size={14} />
                        <span>Delete Offline Audio</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      className="action-btn primary"
                      onClick={() => viewMode === 'juz' ? handleDownloadJuz(currentJuz) : handleDownloadSurah(currentSurah.number)}
                      disabled={Boolean(activeDownloadKey)}
                      style={{ padding: '0.5rem 1.1rem', fontWeight: 600 }}
                    >
                      <DownloadCloud size={16} />
                      <span>Download {viewMode === 'juz' ? `Juz ${currentJuz}` : currentSurah?.englishName} for Offline</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 1-Click Complete Quran Download Card in Tab 1 */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(5,150,105,0.08), rgba(16,185,129,0.04))',
                  border: '1px solid var(--primary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <BookOpen size={16} color="var(--primary)" />
                    <span>Download Complete Quran (All 114 Surahs)</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    {downloadedSurahCount === 114
                      ? '✓ All 114 Surahs are fully downloaded on this device'
                      : `${downloadedSurahCount} of 114 Surahs downloaded • 1-click batch download (~1.2 GB)`}
                  </div>
                </div>

                {downloadedSurahCount === 114 ? (
                  <span className="badge-tag" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                    <CheckCircle2 size={14} /> All 114 Ready
                  </span>
                ) : (
                  <button
                    className="action-btn"
                    onClick={handleDownloadAll}
                    disabled={Boolean(activeDownloadKey)}
                    style={{ borderColor: 'var(--primary)', color: 'var(--primary)', fontWeight: 600 }}
                    id="btn-download-all-tab1"
                  >
                    <DownloadCloud size={15} />
                    <span>{downloadedSurahCount > 0 ? `Download Remaining (${114 - downloadedSurahCount})` : 'Download All 114 Surahs'}</span>
                  </button>
                )}
              </div>

              {/* Informational Guidance */}
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  fontSize: '0.82rem',
                  lineHeight: '1.5',
                  color: 'var(--text-muted)'
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CheckCircle2 size={15} color="var(--primary)" />
                  How Offline Recitation Works
                </div>
                Once downloaded, the entire Arabic Uthmani text, English translation, and audio recitation are stored locally on your device in your browser's persistent cache. You can turn on Airplane mode or go completely offline and all memorization repetition loops will continue playing without internet.
              </div>
            </div>
          )}

          {/* TAB 2: All 114 Surahs */}
          {activeTab === 'surahs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* 1-Click Complete Quran Download Banner in Tab 2 */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(5,150,105,0.12), rgba(16,185,129,0.06))',
                  border: '1.5px solid var(--primary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.85rem'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.96rem', display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--primary)' }}>
                    <BookOpen size={18} />
                    <span>Download Complete Quran (All 114 Surahs)</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {downloadedSurahCount === 114
                      ? '✓ All 114 Surahs (6,236 Ayahs) are downloaded & ready offline!'
                      : `${downloadedSurahCount} of 114 Surahs downloaded • All 6,236 Ayahs • ~1.2 GB • 1-Click`}
                  </div>
                </div>

                {downloadedSurahCount === 114 ? (
                  <span className="badge-tag" style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 600, padding: '0.45rem 0.85rem' }}>
                    <CheckCircle2 size={16} /> Entire Quran Ready
                  </span>
                ) : (
                  <button
                    className="action-btn primary"
                    onClick={handleDownloadAll}
                    disabled={Boolean(activeDownloadKey)}
                    style={{ fontWeight: 600, padding: '0.5rem 1.1rem' }}
                    id="btn-download-all-surahs"
                  >
                    <DownloadCloud size={16} />
                    <span>
                      {downloadedSurahCount > 0
                        ? `Download Remaining (${114 - downloadedSurahCount} Surahs)`
                        : 'Download All 114 Surahs (1-Click)'}
                    </span>
                  </button>
                )}
              </div>

              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search Surah by name or number..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="search-input"
                  style={{ paddingLeft: '2.4rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '50vh', overflowY: 'auto' }}>
                {filteredSurahs.map(s => {
                  const key = getOfflineKey('surah', s.number, reciterId);
                  const isDown = Boolean(offlineIndex[key]?.isComplete);
                  const isCurrentlyDownloading = activeDownloadKey === key;

                  return (
                    <div
                      key={s.number}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.85rem',
                        background: isDown ? 'var(--primary-light)' : 'var(--bg-subtle)',
                        border: isDown ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        gap: '0.75rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                        <span
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}
                        >
                          {s.number}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {s.englishName} <span style={{ fontFamily: 'var(--font-arabic)', fontSize: '0.95rem' }}>({s.name})</span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {s.numberOfAyahs} Ayahs • ~{(s.numberOfAyahs * 0.15).toFixed(1)} MB
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isDown ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <CheckCircle2 size={14} /> Ready
                            </span>
                            <button
                              className="icon-btn"
                              onClick={() => handleDeleteItem(key, s.englishName)}
                              title="Delete from device"
                              style={{ width: '28px', height: '28px' }}
                            >
                              <Trash2 size={13} color="var(--danger)" />
                            </button>
                          </div>
                        ) : isCurrentlyDownloading ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                            <Loader2 size={14} className="spin-animation" />
                            <span>{downloadProgress?.percentage || 0}%</span>
                          </div>
                        ) : (
                          <button
                            className="action-btn"
                            onClick={() => handleDownloadSurah(s.number)}
                            disabled={Boolean(activeDownloadKey)}
                            title={`Download ${s.englishName} for offline`}
                            style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}
                          >
                            <DownloadCloud size={13} />
                            <span>Download</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: 30 Juz */}
          {activeTab === 'juz' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '55vh', overflowY: 'auto' }}>
              {Array.from({ length: 30 }, (_, i) => i + 1).map(jNum => {
                const key = getOfflineKey('juz', jNum, reciterId);
                const isDown = Boolean(offlineIndex[key]?.isComplete);
                const isCurrentlyDownloading = activeDownloadKey === key;

                return (
                  <div
                    key={jNum}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.7rem 0.85rem',
                      background: isDown ? 'var(--primary-light)' : 'var(--bg-subtle)',
                      border: isDown ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        Juz {jNum}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Standard: {juzConvention === 'indopak' ? 'Indo-Pak' : 'Madani'} • ~25-30 MB
                      </div>
                    </div>

                    <div>
                      {isDown ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <CheckCircle2 size={14} /> Ready
                          </span>
                          <button
                            className="icon-btn"
                            onClick={() => handleDeleteItem(key, `Juz ${jNum}`)}
                            title="Delete from device"
                            style={{ width: '28px', height: '28px' }}
                          >
                            <Trash2 size={13} color="var(--danger)" />
                          </button>
                        </div>
                      ) : isCurrentlyDownloading ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                          <Loader2 size={14} className="spin-animation" />
                          <span>{downloadProgress?.percentage || 0}%</span>
                        </div>
                      ) : (
                        <button
                          className="action-btn"
                          onClick={() => handleDownloadJuz(jNum)}
                          disabled={Boolean(activeDownloadKey)}
                          title={`Download Juz ${jNum} for offline`}
                          style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}
                        >
                          <DownloadCloud size={13} />
                          <span>Download</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 4: Downloaded Items */}
          {activeTab === 'downloaded' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Total downloaded for <strong>{reciter?.name}</strong>: <strong>{formatBytes(totalDownloadedBytes)}</strong> ({downloadedItems.length} items)
                </div>

                {downloadedItems.length > 0 && (
                  <button
                    className="action-btn danger"
                    onClick={handleClearAll}
                    style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                  >
                    <Trash2 size={13} />
                    <span>Clear All</span>
                  </button>
                )}
              </div>

              {downloadedItems.length === 0 ? (
                <div
                  style={{
                    padding: '2.5rem 1rem',
                    textAlign: 'center',
                    background: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px dashed var(--border-subtle)',
                    color: 'var(--text-muted)'
                  }}
                >
                  <DownloadCloud size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                    No Offline Recitations Downloaded Yet
                  </div>
                  <div style={{ fontSize: '0.8rem' }}>
                    Switch to the "Current" or "All 114 Surahs" tab above to download any Surah or Juz.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '50vh', overflowY: 'auto' }}>
                  {downloadedItems.map(item => (
                    <div
                      key={item.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.7rem 0.85rem',
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                          {item.name} {item.arabicName ? `(${item.arabicName})` : ''}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {item.count} Ayahs • {formatBytes(item.totalBytes)} • {item.reciterName}
                        </div>
                      </div>

                      <button
                        className="action-btn danger"
                        onClick={() => handleDeleteItem(item.key, item.name)}
                        title="Delete from device"
                        style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer with Device Storage Info */}
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            padding: '0.75rem 1.25rem',
            background: 'var(--bg-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <HardDrive size={14} />
            <span>
              Device Storage: {storageInfo ? `${storageInfo.usageMb} MB used of ${storageInfo.quotaMb} MB available` : 'Available'}
            </span>
          </div>

          <button className="action-btn" onClick={onClose} style={{ padding: '0.35rem 0.85rem' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
