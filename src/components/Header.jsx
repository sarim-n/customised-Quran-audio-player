import React, { useState, useEffect } from 'react';
import { BookOpen, Layers, User, Sun, Moon, Monitor, Globe, Target, Download } from 'lucide-react';
import { promptPwaInstall, isPwaInstalled } from '../pwa';

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
  autoScroll,
  onToggleAutoScroll,
  onShowToast
}) {
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

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
