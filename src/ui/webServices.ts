import type { Clock, LocaleProvider, Navigation, Scheduler } from '../core/platform';
import { Repository } from '../core/storage/repository';
import { STORAGE_KEYS } from '../core/storage/migrate';
import { getGame, legacyRating } from '../core/games/registry';
import { hashNavigation, LocalStorageStore, webClock, webLocale, webScheduler } from '../platform/web';

export interface AppServices {
  repository: Repository;
  scheduler: Scheduler;
  clock: Clock;
  navigation: Navigation;
  locale: LocaleProvider;
}

const reportError = (error: unknown) => console.warn('[brain-trainer] storage error:', error);

/** Web services; localStorage reads synchronously, so no loading screen is needed. */
export function createWebServices(): AppServices {
  const store = new LocalStorageStore();
  const repository = Repository.restore(
    { store, clock: webClock, legacyRating: (id, score) => legacyRating(score, getGame(id).legacyMaxScore), onError: reportError },
    {
      v2: store.getSync(STORAGE_KEYS.v2),
      v1Results: store.getSync(STORAGE_KEYS.v1Results),
      v1TotalScore: store.getSync(STORAGE_KEYS.v1TotalScore),
    },
  );
  return { repository, scheduler: webScheduler, clock: webClock, navigation: hashNavigation, locale: webLocale(store) };
}
