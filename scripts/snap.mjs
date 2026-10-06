#!/usr/bin/env node
// Mobile screenshots of every screen, for layout review without a phone.
//
//   npm run snap                         # ru + he at 390×844, all screens
//   npm run snap -- --langs en --width 360 --height 740 --only menu,schulte
//
// Builds, serves the production build, seeds a demo history (sync off), then
// for each language shoots the menu, every game (intro and a moment of play)
// and the profile tabs into shots/<lang>/. Reports horizontal overflow and
// console errors: the usual signs of a layout broken on narrow screens.
import { execSync, spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const langs = flag('langs', 'ru,he').split(',');
const width = Number(flag('width', 390));
const height = Number(flag('height', 844));
const onlyList = flag('only', '').split(',').filter(Boolean);
const only = onlyList.length > 0 ? onlyList : null;
const port = 4199;
const base = `http://localhost:${port}/brain-trainer/`;

const GAMES = [
  'memory-matrix', 'where-was', 'sequence-recall', 'phone-recall', 'n-back', 'memory-flip',
  'schulte', 'odd-one-out', 'emoji-hunt', 'dual-rule-reaction',
  'whack-a-mole', 'reaction-click', 'track-dot', 'trace-line',
  'rotate-shape', 'mirror', 'fit-piece', 'maze', 'flags-game',
];
const PROFILE_TABS = 3; // overview, games list, achievements (by position)

if (!args.includes('--no-build')) execSync('npm run build', { stdio: 'inherit' });
const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));

function demoHistory() {
  const day = 86_400_000;
  const now = Date.now();
  const recs = [];
  const add = (gameId, score, accuracy, averageTime, daysAgo) =>
    recs.push({ gameId, score, accuracy, averageTime, timestamp: now - daysAgo * day - 3_600_000 });
  [[18, 90, 380, 9], [22, 100, 300, 5], [24, 100, 280, 1]].forEach(([s, a, t, d]) => add('reaction-click', s, a, t, d));
  [[30, 80, 1900, 6], [34, 90, 1600, 2]].forEach(([s, a, t, d]) => add('odd-one-out', s, a, t, d));
  add('memory-flip', 70, 100, 0, 4);
  add('flags-game', 60, 80, 2500, 3);
  return recs;
}

const report = [];
const browser = await chromium.launch();
try {
  for (const lang of langs) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => m.type() === 'error' && errors.push(m.text()));
    await page.goto(`${base}logo.svg`);
    await page.evaluate(([lang, history]) => {
      localStorage.clear();
      localStorage.setItem('brain-trainer-sync-enabled', 'false');
      localStorage.setItem('brain-trainer-language', lang);
      localStorage.setItem('brain-trainer-install-dismissed', '1');
      localStorage.setItem('brain-trainer-prefs', JSON.stringify({ sound: false, vibration: false }));
      localStorage.setItem('brain-trainer-results', JSON.stringify(history));
    }, [lang, demoHistory()]);
    mkdirSync(`shots/${lang}`, { recursive: true });

    const shot = async (name, fullPage = false) => {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 1) report.push(`${lang}/${name}: horizontal overflow ${overflow}px`);
      await page.screenshot({ path: `shots/${lang}/${name}.png`, fullPage });
    };
    const want = name => !only || only.includes(name);

    await page.goto(base);
    await page.waitForTimeout(800);
    // the offline notice covers the footer on first load
    await page.locator('.app-banner .banner-action').click({ timeout: 2000 }).catch(() => undefined);
    if (want('menu')) await shot('menu', true);

    for (const id of GAMES) {
      if (!want(id)) continue;
      await page.goto(`${base}#${id}`);
      await page.waitForTimeout(400);
      await shot(`${id}-intro`, true);
      // start: the first primary button of the intro (Flags has one per mode)
      await page.locator('.game-intro .btn-primary, .intro-card .btn-primary').first().click();
      await page.waitForTimeout(id === 'track-dot' ? 2500 : 1300);
      await shot(`${id}-play`);
    }

    if (want('profile')) {
      await page.goto(`${base}#profile`);
      await page.waitForTimeout(400);
      const tabs = page.locator('.profile-tabs .tab');
      const count = await tabs.count();
      for (let i = 0; i < count; i++) {
        await tabs.nth(i).click();
        await page.waitForTimeout(300);
        await shot(`profile-${i}`, true);
        if (i >= PROFILE_TABS + 2) break;
      }
    }

    for (const e of errors) report.push(`${lang}: console error: ${e}`);
    await context.close();
  }
} finally {
  await browser.close();
  server.kill();
}

console.log(report.length ? report.join('\n') : 'no overflow, no console errors');
console.log(`screenshots: shots/{${langs.join(',')}}/`);
