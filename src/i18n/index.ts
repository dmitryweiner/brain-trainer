import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import ru from './locales/ru.json';
import he from './locales/he.json';

export const SUPPORTED_LANGUAGES = {
  en: { name: 'English', flag: '🇬🇧' },
  ru: { name: 'Русский', flag: '🇷🇺' },
  he: { name: 'עברית', flag: '🇮🇱', dir: 'rtl' },
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ru: { translation: ru },
      he: { translation: he },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'ru', 'he'],
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'brain-trainer-language',
    },

    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

