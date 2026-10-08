// Currencies and languages for the fact quizzes. Names live in the locale
// files (currencies.<id>, languages.<id>).
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

/**
 * Official languages, the main one first. Distractors never include any of
 * a country's languages. Left out: Montenegro (the language's name is
 * disputed) and South Africa (eleven official languages).
 */
export const LANGUAGES_OF: Partial<Record<SupportedCountryCode, readonly string[]>> = {
  AD: ['catalan'], AE: ['arabic'], AF: ['pashto', 'persian'], AL: ['albanian'], AM: ['armenian'], AR: ['spanish'],
  AT: ['german'], AU: ['english'], AZ: ['azerbaijani'], BA: ['bosnian', 'serbian', 'croatian'], BD: ['bengali'],
  BE: ['dutch', 'french', 'german'], BG: ['bulgarian'], BR: ['portuguese'], BY: ['belarusian', 'russian'],
  CA: ['english', 'french'], CH: ['german', 'french', 'italian', 'romansh'], CL: ['spanish'], CN: ['chinese'],
  CO: ['spanish'], CU: ['spanish'], CY: ['greek', 'turkish'], CZ: ['czech'], DE: ['german'], DK: ['danish'],
  DZ: ['arabic', 'berber'], EE: ['estonian'], EG: ['arabic'], ES: ['spanish', 'catalan'], FI: ['finnish', 'swedish'],
  FR: ['french'], GB: ['english'], GE: ['georgian'], GR: ['greek'], HR: ['croatian'], HU: ['hungarian'],
  ID: ['indonesian'], IE: ['english', 'irish'], IL: ['hebrew', 'arabic'], IN: ['hindi', 'english'],
  IQ: ['arabic', 'kurdish'], IR: ['persian'], IS: ['icelandic'], IT: ['italian'], JP: ['japanese'],
  KE: ['swahili', 'english'], KR: ['korean'], KZ: ['kazakh', 'russian'], LT: ['lithuanian'], LV: ['latvian'],
  MA: ['arabic', 'berber'], MD: ['romanian'], MK: ['macedonian'], MX: ['spanish'], MY: ['malay'], NG: ['english'],
  NL: ['dutch'], NO: ['norwegian'], NZ: ['english', 'maori'], PE: ['spanish'], PH: ['filipino', 'english'],
  PK: ['urdu', 'english'], PL: ['polish'], PT: ['portuguese'], RO: ['romanian'], RS: ['serbian'], RU: ['russian'],
  SA: ['arabic'], SE: ['swedish'], SG: ['english', 'malay', 'chinese', 'tamil'], SI: ['slovene'], SK: ['slovak'],
  TH: ['thai'], TR: ['turkish'], TW: ['chinese'], UA: ['ukrainian'], US: ['english'], UZ: ['uzbek'], VE: ['spanish'],
  VN: ['vietnamese'],
};

/** Every currency id, every language id */
export const CURRENCIES: readonly string[] = [...new Set(Object.values(CURRENCY_OF))];
export const LANGUAGES: readonly string[] = [...new Set(Object.values(LANGUAGES_OF).flat() as string[])];

/** Currency → the only country that uses it (for "which country pays in…?") */
export const COUNTRY_OF_UNIQUE_CURRENCY: ReadonlyMap<string, SupportedCountryCode> = new Map(
  CURRENCIES.flatMap(c => {
    const users = (Object.keys(CURRENCY_OF) as SupportedCountryCode[]).filter(k => CURRENCY_OF[k] === c);
    return users.length === 1 ? [[c, users[0]] as const] : [];
  }),
);

/** Language → the only country where it is the main language and nowhere else official */
export const COUNTRY_OF_UNIQUE_LANGUAGE: ReadonlyMap<string, SupportedCountryCode> = new Map(
  LANGUAGES.flatMap(l => {
    const users = (Object.keys(LANGUAGES_OF) as SupportedCountryCode[]).filter(k => LANGUAGES_OF[k]!.includes(l));
    return users.length === 1 && LANGUAGES_OF[users[0]]![0] === l ? [[l, users[0]] as const] : [];
  }),
);
