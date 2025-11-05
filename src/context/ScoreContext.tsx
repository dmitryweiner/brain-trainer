import React, { createContext, useContext, type ReactNode } from 'react';
import { useScore, type UseScoreReturn } from '../hooks/useScore';

// Создаём контекст
const ScoreContext = createContext<UseScoreReturn | undefined>(undefined);

// Props для Provider
export interface ScoreProviderProps {
  children: ReactNode;
}

/**
 * Provider для глобального управления счётом
 */
export const ScoreProvider: React.FC<ScoreProviderProps> = ({ children }) => {
  const scoreValue = useScore();

  return (
    <ScoreContext.Provider value={scoreValue}>
      {children}
    </ScoreContext.Provider>
  );
};

/**
 * Хук для использования ScoreContext
 * Автоматически проверяет, что используется внутри Provider
 */
export const useScoreContext = (): UseScoreReturn => {
  const context = useContext(ScoreContext);
  
  if (context === undefined) {
    throw new Error('useScoreContext must be used within a ScoreProvider');
  }
  
  return context;
};

export default ScoreContext;

