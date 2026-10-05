import en from './locales/en.json';
import ru from './locales/ru.json';
import he from './locales/he.json';
import uk from './locales/uk.json';

export type SupportedLanguage = 'en' | 'ru' | 'he' | 'uk';

export interface LanguageInfo {
  name: string;
  flag: string;
  dir?: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, LanguageInfo> = {
  en: { name: 'English', flag: '🇬🇧' },
  ru: { name: 'Русский', flag: '🇷🇺' },
  he: { name: 'עברית', flag: '🇮🇱', dir: 'rtl' },
  uk: { name: 'Українська', flag: '🇺🇦' },
};

export const RESOURCES = {
  en: { translation: en },
  ru: { translation: ru },
  he: { translation: he },
  uk: { translation: uk },
};

/** 'ru-RU' → 'ru'; anything unsupported → 'en' */
export function normalizeLanguage(tag: string | null | undefined): SupportedLanguage {
  const base = (tag ?? '').toLowerCase().split(/[-_]/)[0];
  // Hebrew has a legacy ISO code that some Android versions still report
  if (base === 'iw') return 'he';
  return base in SUPPORTED_LANGUAGES ? (base as SupportedLanguage) : 'en';
}

export function textDirection(language: string): 'ltr' | 'rtl' {
  return SUPPORTED_LANGUAGES[normalizeLanguage(language)].dir ?? 'ltr';
}
