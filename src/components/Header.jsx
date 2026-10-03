import React from 'react';
import { BookOpen, Layers, User, Sun, Moon, Monitor, Globe, Target } from 'lucide-react';

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
  onToggleAutoScroll
}) {
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
        </div>
      </div>
    </header>
  );
}
