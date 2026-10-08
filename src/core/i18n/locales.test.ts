import { describe, it, expect } from 'vitest';
import { SUPPORTED_COUNTRY_CODES } from '../games/flags/data';
import { CONTINENTS } from '../games/geoQuiz/data';
import { CURRENCIES, CURRENCY_CONFLICTS, LANGUAGES } from '../games/geoQuiz/facts';
import { GAMES } from '../games/registry';
import en from './locales/en.json';
import ru from './locales/ru.json';
import he from './locales/he.json';
import uk from './locales/uk.json';

const LOCALES = { en, ru, he, uk } as Record<string, Record<string, Record<string, unknown>>>;

describe('locales', () => {
  for (const [lang, d] of Object.entries(LOCALES)) {
    it(`${lang}: every country has a name and a capital, every continent and game a name`, () => {
      for (const code of SUPPORTED_COUNTRY_CODES) {
        expect(d.countries[code], `${lang} countries.${code}`).toBeTruthy();
        expect(d.capitals[code], `${lang} capitals.${code}`).toBeTruthy();
      }
      for (const c of CONTINENTS) expect(d.continents[c], `${lang} continents.${c}`).toBeTruthy();
      for (const g of GAMES) expect((d.games[g.id] as { title?: string })?.title, `${lang} games.${g.id}`).toBeTruthy();
    });

    it(`${lang}: currencies and languages have names; options that may meet never read the same`, () => {
      for (const c of CURRENCIES) expect(d.currencies[c], `${lang} currencies.${c}`).toBeTruthy();
      for (const l of LANGUAGES) expect(d.languages[l], `${lang} languages.${l}`).toBeTruthy();
      const known = (a: string, b: string) => CURRENCY_CONFLICTS.some(p => p.includes(a) && p.includes(b));
      for (const a of CURRENCIES) for (const b of CURRENCIES) {
        if (a < b && d.currencies[a] === d.currencies[b]) expect(known(a, b), `${lang}: ${a} = ${b}`).toBe(true);
      }
      expect(new Set(LANGUAGES.map(l => d.languages[l])).size).toBe(LANGUAGES.length);
    });
  }
});
