// Service worker and install prompt (PLAN-IMPROVEMENTS.md, 6.1). Only main.tsx
// starts it; the UI reads the state through the PwaControl it is given.
import { registerSW } from 'virtual:pwa-register';

/** Chrome/Android only; Safari never fires beforeinstallprompt */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PwaState {
  /** A new version is downloaded and waits for the user */
  updateReady: boolean;
  /** Everything is cached: the app works without network */
  offlineReady: boolean;
  /** The browser offers "add to home screen" */
  canInstall: boolean;
}

export interface PwaControl {
  get(): PwaState;
  subscribe(listener: () => void): () => void;
  /** Switches to the waiting version and reloads */
  update(): Promise<void>;
  install(): Promise<void>;
  dismissOffline(): void;
}

/** How often an open app checks for a new version */
const UPDATE_CHECK_MS = 60 * 60 * 1000;

export function startPwa(): PwaControl {
  let state: PwaState = { updateReady: false, offlineReady: false, canInstall: false };
  let deferred: BeforeInstallPromptEvent | null = null;
  const listeners = new Set<() => void>();
  const set = (patch: Partial<PwaState>) => {
    state = { ...state, ...patch };
    listeners.forEach(l => l());
  };

  const updateSW = registerSW({
    onNeedRefresh: () => set({ updateReady: true }),
    onOfflineReady: () => set({ offlineReady: true }),
    onRegisteredSW(_url, registration) {
      // long-lived tabs and installed apps would otherwise only see updates on restart
      if (registration) setInterval(() => void registration.update().catch(() => undefined), UPDATE_CHECK_MS);
    },
  });

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    set({ canInstall: true });
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    set({ canInstall: false });
  });

  return {
    get: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update: () => updateSW(true),
    async install() {
      if (!deferred) return;
      await deferred.prompt();
      await deferred.userChoice.catch(() => undefined);
      deferred = null;
      set({ canInstall: false });
    },
    dismissOffline: () => set({ offlineReady: false }),
  };
}
