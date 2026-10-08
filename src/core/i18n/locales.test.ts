import { describe, it, expect } from 'vitest';
import { SUPPORTED_COUNTRY_CODES } from '../games/flags/data';
import { CONTINENTS } from '../games/geoQuiz/data';
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
  }
});
