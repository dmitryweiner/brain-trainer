import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../i18n';
import './Header.scss';

export interface HeaderProps {
  totalScore: number;
  showBackButton?: boolean;
  onBack?: () => void;
  gameTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  totalScore,
  showBackButton = false,
  onBack,
  gameTitle,
}) => {
  const { t, i18n } = useTranslation();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentLang = i18n.language.split('-')[0] as SupportedLanguage;
  const currentLangData = SUPPORTED_LANGUAGES[currentLang] || SUPPORTED_LANGUAGES.en;

  const handleLanguageChange = (lang: SupportedLanguage) => {
    i18n.changeLanguage(lang);
    setShowLangMenu(false);
    
    // Update document direction for RTL languages
    document.documentElement.dir = SUPPORTED_LANGUAGES[lang].dir || 'ltr';
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

  // Set initial direction
  useEffect(() => {
    const lang = currentLang as SupportedLanguage;
    if (SUPPORTED_LANGUAGES[lang]) {
      document.documentElement.dir = SUPPORTED_LANGUAGES[lang].dir || 'ltr';
    }
  }, [currentLang]);

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
          <h1 className="app-title">
            {gameTitle ? gameTitle : `🧠 ${t('app.title')}`}
          </h1>
        </div>
        
        <div className="header-right">
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
