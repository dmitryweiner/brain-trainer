import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Initialize i18n for tests
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../i18n/locales/en.json';
import ru from '../i18n/locales/ru.json';
import he from '../i18n/locales/he.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ru: { translation: ru },
    he: { translation: he },
  },
  lng: 'ru', // Default to Russian for tests (matches original test expectations)
  fallbackLng: 'ru',
  interpolation: {
    escapeValue: false,
  },
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});

