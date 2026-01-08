import React, { createContext, useContext, type ReactNode } from 'react';
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
  const historyValue = useGameHistory();

  return (
    <GameHistoryContext.Provider value={historyValue}>
      {children}
    </GameHistoryContext.Provider>
  );
};

/**
 * Hook to use GameHistoryContext
 * Automatically checks that it's used within a Provider
 */
export const useGameHistoryContext = (): UseGameHistoryReturn => {
  const context = useContext(GameHistoryContext);
  
  if (context === undefined) {
    throw new Error('useGameHistoryContext must be used within a GameHistoryProvider');
  }
  
  return context;
};

export default GameHistoryContext;

