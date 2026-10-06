// Country data for the Flags game: only countries named in every locale
// file (countries.<code>). Flags are emoji, so nothing is downloaded.

export interface CountryData {
  code: string;
  emoji: string;
}

// List of country codes that have translations
export const SUPPORTED_COUNTRY_CODES = [
  'AD', 'AE', 'AF', 'AL', 'AM', 'AR', 'AT', 'AU', 'AZ',
  'BA', 'BD', 'BE', 'BG', 'BR', 'BY',
  'CA', 'CH', 'CL', 'CN', 'CO', 'CU', 'CY', 'CZ',
  'DE', 'DK', 'DZ',
  'EE', 'EG', 'ES',
  'FI', 'FR',
  'GB', 'GE', 'GR',
  'HR', 'HU',
  'ID', 'IE', 'IL', 'IN', 'IQ', 'IR', 'IS', 'IT',
  'JP',
  'KE', 'KR', 'KZ',
  'LT', 'LV',
  'MA', 'MD', 'ME', 'MK', 'MX', 'MY',
  'NG', 'NL', 'NO', 'NZ',
  'PE', 'PH', 'PK', 'PL', 'PT',
  'RO', 'RS', 'RU',
  'SA', 'SE', 'SG', 'SI', 'SK',
  'TH', 'TR', 'TW',
  'UA', 'US', 'UZ',
  'VE', 'VN',
  'ZA',
] as const;

export type SupportedCountryCode = typeof SUPPORTED_COUNTRY_CODES[number];

// Flag emoji mapping (code -> emoji)
export const FLAG_EMOJIS: Record<SupportedCountryCode, string> = {
  AD: '🇦🇩', AE: '🇦🇪', AF: '🇦🇫', AL: '🇦🇱', AM: '🇦🇲',
  AR: '🇦🇷', AT: '🇦🇹', AU: '🇦🇺', AZ: '🇦🇿',
  BA: '🇧🇦', BD: '🇧🇩', BE: '🇧🇪', BG: '🇧🇬', BR: '🇧🇷', BY: '🇧🇾',
  CA: '🇨🇦', CH: '🇨🇭', CL: '🇨🇱', CN: '🇨🇳', CO: '🇨🇴',
  CU: '🇨🇺', CY: '🇨🇾', CZ: '🇨🇿',
  DE: '🇩🇪', DK: '🇩🇰', DZ: '🇩🇿',
  EE: '🇪🇪', EG: '🇪🇬', ES: '🇪🇸',
  FI: '🇫🇮', FR: '🇫🇷',
  GB: '🇬🇧', GE: '🇬🇪', GR: '🇬🇷',
  HR: '🇭🇷', HU: '🇭🇺',
  ID: '🇮🇩', IE: '🇮🇪', IL: '🇮🇱', IN: '🇮🇳', IQ: '🇮🇶',
  IR: '🇮🇷', IS: '🇮🇸', IT: '🇮🇹',
  JP: '🇯🇵',
  KE: '🇰🇪', KR: '🇰🇷', KZ: '🇰🇿',
  LT: '🇱🇹', LV: '🇱🇻',
  MA: '🇲🇦', MD: '🇲🇩', ME: '🇲🇪', MK: '🇲🇰', MX: '🇲🇽', MY: '🇲🇾',
  NG: '🇳🇬', NL: '🇳🇱', NO: '🇳🇴', NZ: '🇳🇿',
  PE: '🇵🇪', PH: '🇵🇭', PK: '🇵🇰', PL: '🇵🇱', PT: '🇵🇹',
  RO: '🇷🇴', RS: '🇷🇸', RU: '🇷🇺',
  SA: '🇸🇦', SE: '🇸🇪', SG: '🇸🇬', SI: '🇸🇮', SK: '🇸🇰',
  TH: '🇹🇭', TR: '🇹🇷', TW: '🇹🇼',
  UA: '🇺🇦', US: '🇺🇸', UZ: '🇺🇿',
  VE: '🇻🇪', VN: '🇻🇳',
  ZA: '🇿🇦',
};

// Get all countries as CountryData array
export function getAllCountries(): CountryData[] {
  return SUPPORTED_COUNTRY_CODES.map(code => ({
    code,
    emoji: FLAG_EMOJIS[code],
  }));
}
