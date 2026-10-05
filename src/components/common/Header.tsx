import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../i18n';
import './Header.scss';

export interface HeaderProps {
  totalScore: number;
  showBackButton?: boolean;
  onBack?: () => void;
  gameTitle?: string;
  onProfileClick?: () => void;
  showProfileButton?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  totalScore,
  showBackButton = false,
  onBack,
  gameTitle,
  onProfileClick,
  showProfileButton = true,
}) => {
  const { t, i18n } = useTranslation();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentLang = i18n.language.split('-')[0] as SupportedLanguage;
  const currentLangData = SUPPORTED_LANGUAGES[currentLang] || SUPPORTED_LANGUAGES.en;

  const handleLanguageChange = (lang: SupportedLanguage) => {
    // App applies dir/lang and remembers the choice (useDocumentLanguage)
    i18n.changeLanguage(lang);
    setShowLangMenu(false);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowLangMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="app-header">
      <div className="header-content">
        {showBackButton && (
          <button 
            className="back-button"
            onClick={onBack}
            aria-label={t('app.back')}
          >
            ← {t('app.back')}
          </button>
        )}
        
        <div className="header-center">
          <h1 className={`app-title ${gameTitle ? 'game-mode' : ''}`}>
            {gameTitle ? gameTitle : `🧠 ${t('app.title')}`}
          </h1>
        </div>
        
        <div className="header-right">
          {showProfileButton && onProfileClick && (
            <button 
              className="profile-button"
              onClick={onProfileClick}
              aria-label={t('profile.title')}
            >
              👤
            </button>
          )}
          
          <div className="score-display">
            <span className="score-label">{t('app.score')}:</span>
            <span className="score-value">{totalScore}</span>
          </div>
          
          <div className="language-selector" ref={menuRef}>
            <button 
              className="lang-button"
              onClick={() => setShowLangMenu(!showLangMenu)}
              aria-label="Change language"
            >
              {currentLangData.flag}
            </button>
            
            {showLangMenu && (
              <div className="lang-menu">
                {(Object.entries(SUPPORTED_LANGUAGES) as [SupportedLanguage, typeof SUPPORTED_LANGUAGES.en][]).map(([code, data]) => (
                  <button
                    key={code}
                    className={`lang-option ${currentLang === code ? 'active' : ''}`}
                    onClick={() => handleLanguageChange(code)}
                  >
                    <span className="lang-flag">{data.flag}</span>
                    <span className="lang-name">{data.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
