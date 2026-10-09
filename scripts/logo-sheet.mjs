// Contact sheet of logos, to review them by eye at option size.
//
//   node scripts/logo-sheet.mjs                  # every car logo of the quiz → shots/logos.png
//   node scripts/logo-sheet.mjs a.svg b.svg …    # candidate files → shots/logo-candidates.png
//
// Use it before adding brands (does the logo spell the brand? is it legible
// small? enough contrast on white?) and after (nothing missing or broken).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const files = process.argv.slice(2);
const cell = (pic, label) =>
  `<div style="background:#fff;border-radius:10px;padding:10px;text-align:center;overflow-wrap:anywhere">${pic}<br>${label}</div>`;
const img = path => `<img src="${pathToFileURL(resolve(path))}" style="width:64px;height:64px;object-fit:contain">`;

let cells;
let out;
if (files.length > 0) {
  cells = files.map(f => cell(img(f), f.split('/').pop()));
  out = 'shots/logo-candidates.png';
} else {
  const cars = readFileSync('src/core/games/geoQuiz/cars.ts', 'utf8');
  const names = cars.slice(cars.indexOf('CAR_BRAND_NAME'));
  const brands = [...cars.slice(0, cars.indexOf('] as const')).matchAll(/'([a-z-]+)'/g)].map(m => m[1]);
  const logos = readFileSync('src/ui/games/carLogos.ts', 'utf8');
  cells = brands.map(b => {
    const name = names.match(new RegExp(`'?${b}'?: '([^']+)'`))?.[1] ?? `${b} (no name!)`;
    const p = logos.match(new RegExp(`'?${b}'?: \\{ color: '([^']+)', path: '([^']+)'`));
    const pic = p ? `<svg viewBox="0 0 24 24" width="64" height="64"><path fill="${p[1]}" d="${p[2]}"/></svg>` : img(`src/ui/games/car-logos/${b}.svg`);
    return cell(pic, name);
  });
  out = 'shots/logos.png';
}

mkdirSync('shots', { recursive: true });
const html = resolve('shots/.logo-sheet.html');
writeFileSync(html, `<body style="display:grid;grid-template-columns:repeat(8,140px);align-items:start;gap:6px;font:11px sans-serif;background:#f4f4f4">${cells.join('')}</body>`);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 400 } });
await page.goto(pathToFileURL(html).href);
await page.waitForTimeout(300);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(`${cells.length} logos → ${out}`);
