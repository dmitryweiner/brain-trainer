// Anonymous sync key (PLAN-IMPROVEMENTS.md, 6.3): 120 random bits written as
// 24 Crockford base32 characters, shown as six groups of four. The server only
// ever stores SHA-256 of the normalized key.

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const KEY_BYTES = 15;
export const KEY_LENGTH = 24;

/** Encodes 15 random bytes (from the platform's CSPRNG) as a key. */
export function encodeKey(bytes: Uint8Array): string {
  if (bytes.length !== KEY_BYTES) throw new Error(`sync key needs ${KEY_BYTES} bytes`);
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
    value &= (1 << bits) - 1;
  }
  return out;
}

/** Accepts what people type: any case, spaces or dashes, O for 0, I/L for 1. Null if invalid. */
export function parseKey(input: string): string | null {
  const key = input
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
  if (key.length !== KEY_LENGTH) return null;
  for (const ch of key) if (!ALPHABET.includes(ch)) return null;
  return key;
}

export function isSyncKey(u: unknown): u is string {
  return typeof u === 'string' && parseKey(u) === u;
}

/** ABCD-EFGH-… for display */
export function formatKey(key: string): string {
  return key.match(/.{1,4}/g)?.join('-') ?? key;
}
