// Smoke test of the deployed sync worker: uploads one session per given game
// id under a fresh throwaway key, then deletes that key's data. Run it after
// `wrangler deploy` when GAME_IDS changed: a new id is rejected for ~30 s
// until the deploy propagates, so it retries.
//
//   node cloud/scripts/smoke.mjs car-logos currencies
import { randomBytes } from 'node:crypto';

const API = process.env.SYNC_API ?? 'https://brain-trainer-sync.dmitry-weiner.workers.dev';
const ids = process.argv.slice(2);
if (ids.length === 0) {
  console.error('usage: node cloud/scripts/smoke.mjs <gameId> [...]');
  process.exit(1);
}

// a sync key as src/core/sync/key.ts makes it: 120 bits, Crockford base32
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
let bits = 0;
let value = 0;
let key = '';
for (const byte of randomBytes(15)) {
  value = (value << 8) | byte;
  bits += 8;
  while (bits >= 5) {
    key += ALPHABET[(value >>> (bits - 5)) & 31];
    bits -= 5;
  }
  value &= (1 << bits) - 1;
}

const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
const event = gameId => ({
  kind: 'session', id: `smoke-${gameId}`,
  session: {
    id: `smoke-${gameId}`, gameId, schemaVersion: 2, startedAt: Date.now(), durationMs: 1000, level: 1, score: 10,
    rating: 50, accuracy: 100, avgTimeMs: 1000, metrics: { correct: 1, rounds: 1 },
  },
});

let ok = false;
try {
  for (let attempt = 1; attempt <= 6 && !ok; attempt++) {
    const res = await fetch(`${API}/v1/events`, { method: 'POST', headers, body: JSON.stringify({ events: ids.map(event) }) });
    const body = await res.json().catch(() => ({}));
    ok = res.ok && (body.rejected ?? []).length === 0;
    console.log(`attempt ${attempt}: ${res.status} accepted=${JSON.stringify(body.accepted)} rejected=${JSON.stringify(body.rejected)}`);
    if (!ok && attempt < 6) await new Promise(r => setTimeout(r, 10_000));
  }
} finally {
  const res = await fetch(`${API}/v1/account`, { method: 'DELETE', headers });
  console.log(`test data deleted: ${res.status}`);
}
process.exit(ok ? 0 : 1);
