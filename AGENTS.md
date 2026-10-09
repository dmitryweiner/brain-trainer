# Notes for coding agents

Brain trainer: a PWA of short cognitive games (React 18 + Vite + TypeScript),
deployed to GitHub Pages by CI, with optional anonymous cloud sync (Cloudflare
Worker + D1 in `cloud/`). UI languages: ru, en, uk, he (RTL).

## Layout

- `src/core` — pure TypeScript: game engines (`games/<game>/engine.ts`), registry,
  storage schema, stats, i18n. No React, no browser globals, no `Date.now` or
  `Math.random` (ESLint enforces it): time and randomness come in through
  `EngineContext`.
- `src/ui` — screens; `ui/games/<Game>.tsx` draws an engine's state.
- `src/platform/web` — browser adapters (storage, audio, scheduler).
- `cloud/` — the sync worker; it validates events with `src/core/storage/schema.ts`.

## Commands

- `npm run check` — lint + typecheck + tests. Run it before every commit.
  Typecheck is `tsc -b`: `tsc --noEmit -p .` checks nothing here (the root
  tsconfig only references the app/node ones), so it passes on broken code.
- `npm run check:cloud` — the worker's typecheck and tests.
- `npm run snap -- --langs ru,he --only maze,mirror` — builds, serves and
  screenshots each game's intro and play screen at phone size into `shots/`
  (gitignored), reporting horizontal overflow and console errors. Look at the
  PNGs after any visual change. Without `--only` it shoots every menu game.
  Also run it narrow (`--width 360 --height 740`, and `--width 320 --height 640`):
  most layout bugs players reported only showed on small phones. Long and
  short labels must lay out the same way (e.g. a flag always above a country
  name, not beside short names and above long ones).
- `npm run logos` — contact sheet of every car logo (`shots/logos.png`);
  `npm run logos -- a.svg b.svg` previews candidate files.
- `node scripts/crop-emblem.mjs in.svg out.svg [--axis x|y]` — crops a logo to
  its emblem when the brand name stands next to it.
- `npm run i18n:merge -- patch.json` — merges `{ ru: {…}, en: {…}, uk: {…}, he: {…} }`
  into the locale files; `null` deletes a key. Use it instead of ad-hoc scripts:
  it never replaces a whole group (that once wiped a game's nested strings) and
  refuses a patch whose languages add different keys.
- Wrangler needs Node 22 (`.nvmrc`); the default shell may have Node 20:
  `eval "$(fnm env)" && fnm use >/dev/null && npm run deploy:cloud`.
- `npm run smoke:cloud -- <gameId> …` — uploads a session per id to the live
  worker under a throwaway key, then deletes it.
- There is no `timeout` on macOS. Engines' random generators must have bounded
  retry loops: an endless one hangs vitest instead of failing.

## Adding, changing or removing a game

New game id — all of these, in this order:
1. `GameId` in `src/core/types.ts` and `GAME_IDS` in `src/core/storage/schema.ts`.
2. Engine + rating in `src/core/games/…`, entry in `GAMES` in `registry.ts`.
3. Screen in `src/ui/games/`, mapped in `src/ui/gameScreens.tsx`.
4. Strings in all four locales (`games.<id>.title/description`, rules…); the
   locale tests check every language has the same keys.
5. `npm run check`, look at `npm run snap -- --only <id>`.
6. Deploy the worker first (`deploy:cloud`), then `npm run smoke:cloud -- <id>`:
   the worker rejects sessions of ids it does not know yet, and a new id takes
   ~30 s to propagate. Only then push the app.

Removing a game: never delete its id. Move it to `RETIRED_GAMES` (with a
rating) so players' history still shows and syncs.

Changing how a game is scored or leveled: ratings are recomputed from stored
sessions at read time (`normalizeSession`), so old sessions must still rate
sensibly — branch on the metrics they have (`metrics.x === undefined` = older
version), or map them with `sessionLevel` / `levelStep`.

## What players have told us

The players are adults of all ages, many not young; feedback rounds so far
(see PLAN-BACKLOG.md) point the same way:
- Winning matters more than pressure: short games with a clear win, difficulty
  that adapts gently (Repeat: one length per game, win → longer, loss → shorter).
- Readable at small sizes, clear controls, nothing that moves too much per tap.
- Fact quizzes: no question should answer itself. A logo that spells the brand,
  or a language named after its country (Kazakhstan → Kazakh), is too easy.
  Ambiguous answers are worse still: check that exactly one option is right in
  every language (e.g. «рупия» is both the rupee and the rupiah in Russian).
  Coincidences that are fun to know (Algeria/Algiers) stay.
- Assets (logos, flags): only freely licensed sources — Simple Icons (CC0),
  Wikimedia Commons public domain files; record the source (see
  `src/ui/games/car-logos/SOURCES.md`). Not CC BY-SA.

## Workflow the owner has agreed to

Commit and push each finished piece of work on `main`, then watch the CI run
(`gh run watch`); `wrangler deploy` of the sync worker is allowed. Ask before
anything else outward-facing.
