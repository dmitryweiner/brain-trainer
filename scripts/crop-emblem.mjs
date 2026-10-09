// Crops a logo SVG to its emblem when the brand name stands beside or under it
// (the quiz must not show the name). Only the viewBox changes; the drawing
// stays as it is.
//
//   node scripts/crop-emblem.mjs in.svg out.svg [--axis x|y]
//
// --axis x (default): the emblem is left of the name; y: above it. The
// emblem ends at the first empty band wider than 3% of the logo, found on a
// rendered image, so it works whatever the SVG's structure (one path or many).
// Check the result with scripts/logo-sheet.mjs.
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const [input, output] = process.argv.slice(2);
const axisAt = process.argv.indexOf('--axis');
const axis = axisAt > 0 ? process.argv[axisAt + 1] : 'x';
if (!input || !output || !['x', 'y'].includes(axis)) {
  console.error('usage: node scripts/crop-emblem.mjs in.svg out.svg [--axis x|y]');
  process.exit(1);
}

const src = readFileSync(input, 'utf8');
const vbAttr = src.match(/<svg\b[^>]*\bviewBox="([^"]+)"/);
if (!vbAttr) throw new Error('the SVG has no viewBox');
const vb = vbAttr[1].trim().split(/[\s,]+/).map(Number);

const browser = await chromium.launch();
const page = await browser.newPage();
const box = await page.evaluate(async ({ src, vb, axis }) => {
  const W = 2000;
  const H = Math.round((W * vb[3]) / vb[2]);
  const img = new Image();
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(src)));
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  g.drawImage(img, 0, 0, W, H);
  const d = g.getImageData(0, 0, W, H).data;
  const ink = (x, y) => d[(y * W + x) * 4 + 3] > 20;
  const [len, cross] = axis === 'x' ? [W, H] : [H, W];
  const at = (i, j) => (axis === 'x' ? ink(i, j) : ink(j, i));
  const lineInk = i => { for (let j = 0; j < cross; j++) if (at(i, j)) return true; return false; };
  let start = 0;
  while (start < len && !lineInk(start)) start++;
  let i = start;
  let empty = 0;
  for (; i < len; i++) {
    if (lineInk(i)) empty = 0;
    else if (++empty > len * 0.03) break;
  }
  const end = i - empty;
  let lo = cross;
  let hi = 0;
  for (let a = start; a <= end; a++) for (let b = 0; b < cross; b++) if (at(a, b)) { lo = Math.min(lo, b); hi = Math.max(hi, b); }
  const s = vb[2] / W;
  return axis === 'x'
    ? [vb[0] + start * s, vb[1] + lo * s, (end - start + 1) * s, (hi - lo + 1) * s]
    : [vb[0] + lo * s, vb[1] + start * s, (hi - lo + 1) * s, (end - start + 1) * s];
}, { src, vb, axis });
await browser.close();

const pad = Math.max(box[2], box[3]) * 0.04;
const viewBox = [box[0] - pad, box[1] - pad, box[2] + 2 * pad, box[3] + 2 * pad].map(v => +v.toFixed(2)).join(' ');
const cropped = src.replace(/<svg\b([^>]*)>/, (_, attrs) => `<svg${attrs.replace(/\s(width|height|viewBox)="[^"]*"/g, '')} viewBox="${viewBox}">`);
writeFileSync(output, cropped);
console.log(`${output}: viewBox ${viewBox}`);
