// Web implementations of the core platform ports (core/platform.ts).
import type { Clock, KeyValueStore, LocaleProvider, Navigation, Route, Scheduler } from '../../core/platform';

function storage(): Storage | null {
  try {
    const s = window.localStorage;
    const probe = '__brain_trainer_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

/** localStorage (or memory when it is blocked, e.g. in some private modes) */
export class LocalStorageStore implements KeyValueStore {
  private readonly ls = storage();
  private readonly memory = new Map<string, string>();

  getSync(key: string): string | null {
    try {
      return this.ls ? this.ls.getItem(key) : this.memory.get(key) ?? null;
    } catch {
      return null;
    }
  }

  async get(key: string): Promise<string | null> {
    return this.getSync(key);
  }

  async set(key: string, value: string): Promise<void> {
    if (this.ls) this.ls.setItem(key, value);
    else this.memory.set(key, value);
  }

  async remove(key: string): Promise<void> {
    if (this.ls) this.ls.removeItem(key);
    else this.memory.delete(key);
  }

  watch(key: string, listener: () => void): () => void {
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) listener();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }
}

export const webScheduler: Scheduler = {
  now: () => performance.now(),
  setTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
  clearTimeout: handle => window.clearTimeout(handle as number),
};

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export const webClock: Clock = {
  wallNow: () => Date.now(),
  newId: randomId,
};

function parseHash(hash: string): Route {
  const h = hash.replace(/^#/, '');
  if (h === '' || h === 'menu') return { view: 'menu' };
  if (h === 'profile') return { view: 'profile' };
  return { view: 'game', gameId: h };
}

function routeHash(route: Route): string {
  if (route.view === 'profile') return 'profile';
  if (route.view === 'game') return route.gameId;
  return '';
}

/** Hash routing: works from file:// and inside a WebView without a server. */
export const hashNavigation: Navigation = {
  current: () => parseHash(window.location.hash),
  go(route) {
    const next = routeHash(route);
    if (window.location.hash.replace(/^#/, '') !== next) window.location.hash = next;
  },
  subscribe(listener) {
    const onChange = () => listener(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  },
};

export const LANGUAGE_KEY = 'brain-trainer-language';

export function webLocale(store: LocalStorageStore): LocaleProvider {
  return {
    initialLanguage: () => store.getSync(LANGUAGE_KEY) ?? navigator.language ?? 'en',
    save: language => void store.set(LANGUAGE_KEY, language).catch(() => undefined),
  };
}
