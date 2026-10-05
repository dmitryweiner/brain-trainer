import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { ServicesProvider, useOptionalServices } from '../ui/services';
import { createWebServices } from '../ui/webServices';
import { useGameHistory, type UseGameHistoryReturn } from '../hooks/useGameHistory';

// Create context
const GameHistoryContext = createContext<UseGameHistoryReturn | undefined>(undefined);

// Props for Provider
export interface GameHistoryProviderProps {
  children: ReactNode;
}

/**
 * Provider for global game history management
 */
export const GameHistoryProvider: React.FC<GameHistoryProviderProps> = ({ children }) => {
  // Outside the app shell (component tests) fall back to localStorage-backed services
  const shared = useOptionalServices();
  const [fallback] = useState(() => (shared ? null : createWebServices()));
  const services = (shared ?? fallback)!;
  const historyValue = useGameHistory(services.repository, services.clock);

  const provided = (
    <GameHistoryContext.Provider value={historyValue}>
      {children}
    </GameHistoryContext.Provider>
  );
  return fallback ? <ServicesProvider services={fallback}>{provided}</ServicesProvider> : provided;
};

/**
 * Hook to use GameHistoryContext
 * Automatically checks that it's used within a Provider
 */
// eslint-disable-next-line react-refresh/only-export-components -- replaced by core storage (PLAN-IMPROVEMENTS.md, stage 1)
export const useGameHistoryContext = (): UseGameHistoryReturn => {
  const context = useContext(GameHistoryContext);
  
  if (context === undefined) {
    throw new Error('useGameHistoryContext must be used within a GameHistoryProvider');
  }
  
  return context;
};

export default GameHistoryContext;

