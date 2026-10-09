// Currencies for the fact quiz. Names live in the locale files (currencies.<id>).
import type { SupportedCountryCode } from '../flags/data';

/**
 * Currencies as players name them, without the country ("dollar", not
 * "Australian dollar", which would give the answer away). Countries sharing
 * a currency share the id (euro, dollar, peso…).
 */
export const CURRENCY_OF: Record<SupportedCountryCode, string> = {
  AD: 'euro', AE: 'dirham', AF: 'afghani', AL: 'lek', AM: 'dram', AR: 'peso', AT: 'euro', AU: 'dollar', AZ: 'manat',
  BA: 'mark', BD: 'taka', BE: 'euro', BG: 'euro', BR: 'real', BY: 'ruble', CA: 'dollar', CH: 'franc', CL: 'peso',
  CN: 'yuan', CO: 'peso', CU: 'peso', CY: 'euro', CZ: 'krona', DE: 'euro', DK: 'krona', DZ: 'dinar', EE: 'euro',
  EG: 'pound', ES: 'euro', FI: 'euro', FR: 'euro', GB: 'pound', GE: 'lari', GR: 'euro', HR: 'euro', HU: 'forint',
  ID: 'rupiah', IE: 'euro', IL: 'shekel', IN: 'rupee', IQ: 'dinar', IR: 'rial', IS: 'krona', IT: 'euro', JP: 'yen',
  KE: 'shilling', KR: 'won', KZ: 'tenge', LT: 'euro', LV: 'euro', MA: 'dirham', MD: 'leu', ME: 'euro', MK: 'denar',
  MX: 'peso', MY: 'ringgit', NG: 'naira', NL: 'euro', NO: 'krona', NZ: 'dollar', PE: 'sol', PH: 'peso', PK: 'rupee',
  PL: 'zloty', PT: 'euro', RO: 'leu', RS: 'dinar', RU: 'ruble', SA: 'rial', SE: 'krona', SG: 'dollar', SI: 'euro',
  SK: 'euro', TH: 'baht', TR: 'lira', TW: 'dollar', UA: 'hryvnia', US: 'dollar', UZ: 'sum', VE: 'bolivar', VN: 'dong',
  ZA: 'rand',
};

/**
 * Pairs that read the same in some language and must never be options of
 * one question: "рупия" (rupee / rupiah) in Russian, "ריאל" (real / rial) in
 * Hebrew, where the Egyptian pound is also a "לירה" (lira).
 */
export const CURRENCY_CONFLICTS: readonly [string, string][] = [['rupee', 'rupiah'], ['real', 'rial'], ['pound', 'lira']];

/** Every currency id */
export const CURRENCIES: readonly string[] = [...new Set(Object.values(CURRENCY_OF))];

/** Currency → the only country that uses it (for "which country pays in…?") */
export const COUNTRY_OF_UNIQUE_CURRENCY: ReadonlyMap<string, SupportedCountryCode> = new Map(
  CURRENCIES.flatMap(c => {
    const users = (Object.keys(CURRENCY_OF) as SupportedCountryCode[]).filter(k => CURRENCY_OF[k] === c);
    return users.length === 1 ? [[c, users[0]] as const] : [];
  }),
);

/** Each country's currency sign, as printed on its price tags */
export const CURRENCY_SYMBOL_OF: Record<SupportedCountryCode, string> = {
  AD: '€', AE: 'د.إ', AF: '؋', AL: 'L', AM: '֏', AR: '$', AT: '€', AU: '$', AZ: '₼', BA: 'KM', BD: '৳', BE: '€', BG: '€',
  BR: 'R$', BY: 'Br', CA: '$', CH: 'Fr.', CL: '$', CN: '¥', CO: '$', CU: '$', CY: '€', CZ: 'Kč', DE: '€', DK: 'kr',
  DZ: 'د.ج', EE: '€', EG: 'E£', ES: '€', FI: '€', FR: '€', GB: '£', GE: '₾', GR: '€', HR: '€', HU: 'Ft', ID: 'Rp',
  IE: '€', IL: '₪', IN: '₹', IQ: 'ع.د', IR: '﷼', IS: 'kr', IT: '€', JP: '¥', KE: 'KSh', KR: '₩', KZ: '₸', LT: '€',
  LV: '€', MA: 'د.م.', MD: 'L', ME: '€', MK: 'ден', MX: '$', MY: 'RM', NG: '₦', NL: '€', NO: 'kr', NZ: '$', PE: 'S/',
  PH: '₱', PK: 'Rs', PL: 'zł', PT: '€', RO: 'lei', RS: 'дин.', RU: '₽', SA: 'ر.س', SE: 'kr', SG: '$', SI: '€',
  SK: '€', TH: '฿', TR: '₺', TW: 'NT$', UA: '₴', US: '$', UZ: 'soʻm', VE: 'Bs.', VN: '₫', ZA: 'R',
};

/**
 * The sign shown with a currency among the options when no country is in
 * question: the usual one, or none where the countries sharing the name use
 * different signs (dinar, dirham, rial, leu).
 */
export const CURRENCY_SYMBOL: Record<string, string | null> = {
  euro: '€', dirham: null, afghani: '؋', lek: 'L', dram: '֏', peso: '$', dollar: '$', manat: '₼', mark: 'KM', taka: '৳',
  real: 'R$', ruble: '₽', franc: 'Fr.', yuan: '¥', krona: 'kr', dinar: null, pound: '£', lari: '₾', forint: 'Ft',
  rupiah: 'Rp', shekel: '₪', rupee: '₹', rial: null, yen: '¥', shilling: 'KSh', won: '₩', tenge: '₸', leu: null,
  denar: 'ден', ringgit: 'RM', naira: '₦', sol: 'S/', zloty: 'zł', baht: '฿', lira: '₺', hryvnia: '₴', sum: 'soʻm',
  bolivar: 'Bs.', dong: '₫', rand: 'R',
};

/** The sign of `currency`, as used in `country` when it is that country's currency */
export function currencySymbol(currency: string, country?: SupportedCountryCode): string | null {
  return country && CURRENCY_OF[country] === currency ? CURRENCY_SYMBOL_OF[country] : CURRENCY_SYMBOL[currency] ?? null;
}
