import type { Clock, LocaleProvider, Navigation, Scheduler } from '../core/platform';
import { Repository } from '../core/storage/repository';
import { STORAGE_KEYS } from '../core/storage/migrate';
import { getGame, legacyRating } from '../core/games/registry';
import { hashNavigation, LocalStorageStore, webClock, webLocale, webScheduler } from '../platform/web';
import { createWebSync, type WebSync } from '../platform/web/sync';
import type { PwaControl } from '../platform/web/pwa';
import type { ToneOutput } from '../platform/web/audio';
import { WebPrefs } from '../platform/web/prefs';
import type { FeedbackOutput } from '../platform/web/feedback';

export interface AppServices {
  repository: Repository;
  scheduler: Scheduler;
  clock: Clock;
  navigation: Navigation;
  locale: LocaleProvider;
  /** Cloud sync; absent in tests and wherever the app runs without it */
  sync?: WebSync;
  /** Service worker state; started by main.tsx only */
  pwa?: PwaControl;
  /** Game sounds; absent in tests */
  audio?: ToneOutput;
  /** Sound / vibration switches of this device */
  prefs: WebPrefs;
  /** Cue player; absent in tests */
  feedback?: FeedbackOutput;
}

const reportError = (error: unknown) => console.warn('[brain-trainer] storage error:', error);

/** Web services; localStorage reads synchronously, so no loading screen is needed. */
export function createWebServices(options: { sync?: boolean } = {}): AppServices {
  const store = new LocalStorageStore();
  const repository = Repository.restore(
    { store, clock: webClock, legacyRating: (id, score) => legacyRating(score, getGame(id).legacyMaxScore), onError: reportError },
    {
      v2: store.getSync(STORAGE_KEYS.v2),
      v1Results: store.getSync(STORAGE_KEYS.v1Results),
      v1TotalScore: store.getSync(STORAGE_KEYS.v1TotalScore),
    },
  );
  const sync = options.sync ? createWebSync({ repository, scheduler: webScheduler, clock: webClock, store }) : undefined;
  return {
    repository, scheduler: webScheduler, clock: webClock, navigation: hashNavigation, locale: webLocale(store), sync,
    prefs: new WebPrefs(store),
  };
}
