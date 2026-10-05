import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { LocaleProvider } from '../core/platform';
import { normalizeLanguage, RESOURCES } from '../core/i18n/languages';

export { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../core/i18n/languages';

/** Starts i18next in the language the platform reports (saved choice or device language). */
export function initI18n(locale: LocaleProvider) {
  return i18n.use(initReactI18next).init({
    resources: RESOURCES,
    lng: normalizeLanguage(locale.initialLanguage()),
    fallbackLng: 'en',
    supportedLngs: ['en', 'ru', 'he', 'uk'],
    interpolation: {
      escapeValue: false,
    },
  });
}

export default i18n;
