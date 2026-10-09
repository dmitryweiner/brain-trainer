// Merges a patch into the four locale files without touching anything else.
//
//   node scripts/i18n-merge.mjs patch.json
//
// patch.json: { "ru": { "games": { "maze": { "title": "…" } } }, "en": {…}, "uk": {…}, "he": {…} }
// Objects are merged key by key (never replaced as a whole, so nested strings
// survive); a null value deletes the key. Every language in the patch must add
// the same keys, so no locale is left behind.
import { readFileSync, writeFileSync } from 'node:fs';

const LANGS = ['ru', 'en', 'uk', 'he'];
const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/i18n-merge.mjs patch.json');
  process.exit(1);
}
const patch = JSON.parse(readFileSync(file, 'utf8'));

const leaves = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) => (v && typeof v === 'object' ? leaves(v, `${prefix}${k}.`) : [`${prefix}${k}`]));

const reference = leaves(patch[LANGS.find(l => patch[l])] ?? {}).sort().join('\n');
for (const lang of LANGS) {
  if (!patch[lang]) throw new Error(`patch has no "${lang}"`);
  if (leaves(patch[lang]).sort().join('\n') !== reference) throw new Error(`"${lang}" patches other keys than the rest`);
}

function merge(target, src, path) {
  for (const [k, v] of Object.entries(src)) {
    if (v === null) delete target[k];
    else if (typeof v === 'object') {
      if (target[k] !== undefined && (typeof target[k] !== 'object' || target[k] === null)) throw new Error(`${path}${k} is a string, not a group`);
      merge((target[k] ??= {}), v, `${path}${k}.`);
    } else target[k] = v;
  }
}

for (const lang of LANGS) {
  const path = `src/core/i18n/locales/${lang}.json`;
  const data = JSON.parse(readFileSync(path, 'utf8'));
  merge(data, patch[lang], '');
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}
console.log(`merged ${reference.split('\n').filter(Boolean).length} keys into ${LANGS.join(', ')}`);
