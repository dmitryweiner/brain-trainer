// Wires core + platform into React. The app gets one AppServices instance;
// components reach it through useServices().
import React, { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { AppServices } from './webServices';

export type { AppServices };
import type { Repository } from '../core/storage/repository';
import type { StoredEvent } from '../core/storage/schema';

const ServicesContext = createContext<AppServices | null>(null);

export const ServicesProvider: React.FC<{ services: AppServices; children: ReactNode }> = ({ services, children }) => (
  <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>
);

// eslint-disable-next-line react-refresh/only-export-components -- hooks belong with their provider
export function useServices(): AppServices {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('useServices must be used within a ServicesProvider');
  return services;
}

/** For transitional providers that may be rendered without the app shell (tests). */
// eslint-disable-next-line react-refresh/only-export-components
export function useOptionalServices(): AppServices | null {
  return useContext(ServicesContext);
}

/** Re-renders on every change of the event log. */
// eslint-disable-next-line react-refresh/only-export-components
export function useEvents(repository: Repository): readonly StoredEvent[] {
  return useSyncExternalStore(
    listener => repository.subscribe(listener),
    () => repository.events,
  );
}
