// Device preferences (not synced: a phone may want silence, a tablet sound).
import type { LocalStorageStore } from './index';

export interface Prefs {
  sound: boolean;
  vibration: boolean;
}

const KEY = 'brain-trainer-prefs';
const DEFAULTS: Prefs = { sound: true, vibration: true };

export class WebPrefs {
  private value: Prefs;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly store: LocalStorageStore) {
    let saved: Partial<Prefs> = {};
    try {
      saved = JSON.parse(store.getSync(KEY) ?? '{}');
    } catch {
      // corrupt value: defaults
    }
    this.value = {
      sound: typeof saved.sound === 'boolean' ? saved.sound : DEFAULTS.sound,
      vibration: typeof saved.vibration === 'boolean' ? saved.vibration : DEFAULTS.vibration,
    };
  }

  get(): Prefs {
    return this.value;
  }

  set(patch: Partial<Prefs>): void {
    this.value = { ...this.value, ...patch };
    void this.store.set(KEY, JSON.stringify(this.value)).catch(() => undefined);
    this.listeners.forEach(l => l());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
