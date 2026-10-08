// Facts for the geography quizzes. Names live in the locale files
// (countries.<code>, capitals.<code>, continents.<id>); here only the codes.
import { SUPPORTED_COUNTRY_CODES, type SupportedCountryCode } from '../flags/data';

export type Continent = 'europe' | 'asia' | 'africa' | 'north-america' | 'south-america' | 'oceania';

export const CONTINENTS: readonly Continent[] = ['europe', 'asia', 'africa', 'north-america', 'south-america', 'oceania'];

/**
 * Countries that lie in one part of the world without dispute. Transcontinental
 * ones (Russia, Turkey, Kazakhstan, Egypt, the Caucasus, Cyprus) are left out:
 * a quiz should not have an arguable answer.
 */
export const CONTINENT_OF: Partial<Record<SupportedCountryCode, Continent>> = {
  AD: 'europe', AL: 'europe', AT: 'europe', BA: 'europe', BE: 'europe', BG: 'europe', BY: 'europe', CH: 'europe',
  CZ: 'europe', DE: 'europe', DK: 'europe', EE: 'europe', ES: 'europe', FI: 'europe', FR: 'europe', GB: 'europe',
  GR: 'europe', HR: 'europe', HU: 'europe', IE: 'europe', IS: 'europe', IT: 'europe', LT: 'europe', LV: 'europe',
  MD: 'europe', ME: 'europe', MK: 'europe', NL: 'europe', NO: 'europe', PL: 'europe', PT: 'europe', RO: 'europe',
  RS: 'europe', SE: 'europe', SI: 'europe', SK: 'europe', UA: 'europe',
  AE: 'asia', AF: 'asia', BD: 'asia', CN: 'asia', ID: 'asia', IL: 'asia', IN: 'asia', IQ: 'asia', IR: 'asia',
  JP: 'asia', KR: 'asia', MY: 'asia', PH: 'asia', PK: 'asia', SA: 'asia', SG: 'asia', TH: 'asia', TW: 'asia',
  UZ: 'asia', VN: 'asia',
  DZ: 'africa', KE: 'africa', MA: 'africa', NG: 'africa', ZA: 'africa',
  CA: 'north-america', CU: 'north-america', MX: 'north-america', US: 'north-america',
  AR: 'south-america', BR: 'south-america', CL: 'south-america', CO: 'south-america', PE: 'south-america', VE: 'south-america',
  AU: 'oceania', NZ: 'oceania',
};

/**
 * Countries whose capital is asked about. Left out: Singapore (a city-state)
 * and Algeria (in Russian the capital and the country are both «Алжир»).
 */
export const CAPITAL_COUNTRIES: readonly SupportedCountryCode[] = SUPPORTED_COUNTRY_CODES.filter(c => c !== 'SG' && c !== 'DZ');
