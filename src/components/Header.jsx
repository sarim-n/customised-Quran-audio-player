import React, { useState, useEffect } from 'react';
import { BookOpen, Layers, User, Sun, Moon, Monitor, Globe, Target, Download, DownloadCloud, CheckCircle2, Flame, Sparkles } from 'lucide-react';
import { promptPwaInstall, isPwaInstalled } from '../pwa';
import { isItemDownloaded } from '../services/offlineStorage';

export function Header({
  viewMode,
  currentSurah,
  currentJuz,
  reciter,
  theme,
  setTheme,
  showTranslation,
  setShowTranslation,
  onOpenSurahModal,
  onOpenJuzModal,
  onOpenReciterModal,
  onOpenGoToAyahModal,
  onOpenOfflineModal,
  onOpenWeakSpotsModal,
  weakSpotsCount = 0,
  weakSpotsScopeCount = 0,
  onSelectMushaf7,
  onSelectTaj,
  autoScroll,
  onToggleAutoScroll,
  onShowToast
}) {
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isOfflineReady, setIsOfflineReady] = useState(false);

  useEffect(() => {
    const checkOffline = () => {
      const type = viewMode === 'juz' ? 'juz' : 'surah';
      const id = viewMode === 'juz' ? currentJuz : currentSurah?.number || 1;
      setIsOfflineReady(isItemDownloaded(type, id, reciter?.id));
    };
    checkOffline();

    const handleUpdate = () => checkOffline();
    window.addEventListener('quran-offline-index-updated', handleUpdate);
    return () => window.removeEventListener('quran-offline-index-updated', handleUpdate);
  }, [viewMode, currentSurah?.number, currentJuz, reciter?.id]);

  useEffect(() => {
    setIsStandalone(isPwaInstalled());

    const handleCanInstall = (e) => {
      setCanInstall(Boolean(e.detail));
    };

    window.addEventListener('pwa-can-install', handleCanInstall);

    // iOS detection for Safari Add to Home Screen guidance
    const isIos = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIos && !isPwaInstalled()) {
      setCanInstall(true);
    }

    return () => window.removeEventListener('pwa-can-install', handleCanInstall);
  }, []);

  const handleInstallClick = async () => {
    const isIos = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIos) {
      if (onShowToast) {
        onShowToast("Tap Safari's Share button (⎋) below, then select 'Add to Home Screen' (+)");
      } else {
        alert("To install on iOS: Tap the Share button (⎋) in Safari and choose 'Add to Home Screen'.");
      }
      return;
    }

    const accepted = await promptPwaInstall();
    if (accepted && onShowToast) {
      onShowToast("App installation started! Check your home screen.");
    }
  };

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <header className="app-header">
      <div className="header-inner">
        {/* Brand */}
        <div className="app-brand">
          <div className="brand-icon">
            <BookOpen size={20} />
          </div>
          <div>
            <div className="brand-title">Quran Memorizer</div>
            <div className="brand-subtitle">Listening & Flexible Repetition</div>
          </div>
        </div>

        {/* Navigation & Selector Buttons */}
        <div className="header-actions">
          {/* Surah Selector Button */}
          <button
            className={`action-btn ${viewMode === 'surah' ? 'primary' : ''}`}
            onClick={onOpenSurahModal}
            title="Browse and select from all 114 Surahs"
            id="btn-select-surah"
          >
            <BookOpen size={16} />
            <span>{currentSurah ? `${currentSurah.number}. ${currentSurah.englishName}` : 'Select Surah'}</span>
          </button>

          {/* Juz Selector Button */}
          <button
            className={`action-btn ${viewMode === 'juz' ? 'primary' : ''}`}
            onClick={onOpenJuzModal}
            title="Browse and select from 30 Juz/Paras"
            id="btn-select-juz"
          >
            <Layers size={16} />
            <span>{viewMode === 'juz' ? `Juz ${currentJuz}` : '30 Juz'}</span>
          </button>

          {/* Authentic Quran Foundation 16-Line Mode Button */}
          <button
            className={`action-btn ${viewMode === 'mushaf7' ? 'primary' : ''}`}
            onClick={onSelectMushaf7}
            title="Switch to authentic Quran Foundation IndoPak 16-Line Mushaf"
            id="btn-select-mushaf7-view"
            style={viewMode === 'mushaf7' ? { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' } : {}}
          >
            <Sparkles size={16} />
            <span>16-Line (QF)</span>
          </button>

          {/* Taj Company Scanned 16-Line Mode Button */}
          <button
            className={`action-btn ${viewMode === 'taj' ? 'primary' : ''}`}
            onClick={onSelectTaj}
            title="Switch to Taj Company 16-Line Scanned Mushaf"
            id="btn-select-taj-view"
            style={viewMode === 'taj' ? { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' } : {}}
          >
            <BookOpen size={16} />
            <span>Taj Mushaf</span>
          </button>

          {/* Go to Ayah Trigger Button (Permanently visible in sticky header) */}
          <button
            className="action-btn"
            onClick={onOpenGoToAyahModal}
            title="Go to a specific Ayah"
            id="header-btn-open-go-to-ayah"
            style={{ borderColor: 'var(--primary)', color: 'var(--primary)', background: 'var(--bg-subtle)' }}
          >
            <Target size={16} />
            <span>Go to Ayah</span>
          </button>

          {/* Weak Spots & Revision Tracker Modal Button */}
          <button
            className={`action-btn ${weakSpotsCount > 0 ? 'warning' : ''}`}
            onClick={onOpenWeakSpotsModal}
            title={weakSpotsCount > 0 ? `${weakSpotsScopeCount} weak spots in current ${viewMode === 'juz' ? `Juz ${currentJuz}` : 'Surah'} (${weakSpotsCount} overall). Click to revise!` : 'Open Weak Spots & Mistake Tracker'}
            id="btn-open-weak-spots-modal"
            style={
              weakSpotsCount > 0
                ? {
                    borderColor: 'rgba(239, 68, 68, 0.5)',
                    color: '#ef4444',
                    background: 'rgba(239, 68, 68, 0.08)'
                  }
                : {}
            }
          >
            <Flame size={16} color={weakSpotsCount > 0 ? '#ef4444' : 'currentColor'} />
            <span>
              Weak Spots {weakSpotsCount > 0 ? (
                weakSpotsScopeCount > 0 && weakSpotsScopeCount !== weakSpotsCount
                  ? `(${weakSpotsScopeCount} / ${weakSpotsCount})`
                  : `(${weakSpotsCount})`
              ) : ''}
            </span>
          </button>

          {/* Reciter Selector Button */}
          <button
            className="action-btn"
            onClick={onOpenReciterModal}
            title="Choose Quran reciter"
            id="btn-select-reciter"
          >
            <User size={16} />
            <span style={{ maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {reciter?.name?.split(' ')?.[0] || 'Reciter'}
            </span>
          </button>

          {/* Offline Downloads Manager Button */}
          <button
            className={`action-btn ${isOfflineReady ? 'active' : ''}`}
            onClick={onOpenOfflineModal}
            title={isOfflineReady ? 'Current recitation is downloaded for offline playback' : 'Download recitation for offline listening'}
            id="btn-open-offline-modal"
            style={isOfflineReady ? { borderColor: 'var(--primary)', color: 'var(--primary)', background: 'var(--primary-light)' } : {}}
          >
            {isOfflineReady ? <CheckCircle2 size={16} color="var(--primary)" /> : <DownloadCloud size={16} />}
            <span>{isOfflineReady ? 'Offline Ready' : 'Download'}</span>
          </button>

          {/* Translation Toggle */}
          <button
            className={`icon-btn ${showTranslation ? 'active' : ''}`}
            onClick={() => setShowTranslation(!showTranslation)}
            title={showTranslation ? 'Hide English Translation' : 'Show English Translation'}
            id="btn-toggle-translation"
          >
            <Globe size={16} />
          </button>

          {/* Auto-scroll Follow Toggle */}
          <button
            className={`icon-btn ${autoScroll ? 'active' : ''}`}
            onClick={onToggleAutoScroll}
            title={autoScroll ? 'Auto-scroll Follow is ON (Click to disable screen navigation)' : 'Auto-scroll Follow is OFF (Screen stays still)'}
            id="btn-toggle-autoscroll"
            style={autoScroll ? { color: 'var(--primary)', borderColor: 'var(--primary)' } : {}}
          >
            <Target size={16} />
          </button>

          {/* Theme Toggle */}
          <button
            className="icon-btn"
            onClick={toggleTheme}
            title={`Current theme: ${theme}. Click to change.`}
            id="btn-toggle-theme"
          >
            {theme === 'light' ? <Sun size={16} /> : theme === 'dark' ? <Moon size={16} /> : <Monitor size={16} />}
          </button>

          {/* Mobile / PWA Install Button */}
          {canInstall && !isStandalone && (
            <button
              className="action-btn"
              onClick={handleInstallClick}
              title="Install Quran Memorizer App on your device"
              id="btn-install-pwa"
              style={{
                background: 'var(--primary)',
                color: 'var(--primary-text)',
                borderColor: 'var(--primary)',
                fontWeight: 600,
                padding: '0.45rem 0.75rem'
              }}
            >
              <Download size={15} />
              <span>Install App</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
