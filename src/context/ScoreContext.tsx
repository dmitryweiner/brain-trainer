import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { ServicesProvider, useOptionalServices } from '../ui/services';
import { createWebServices } from '../ui/webServices';
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
  // Outside the app shell (component tests) fall back to localStorage-backed services
  const shared = useOptionalServices();
  const [fallback] = useState(() => (shared ? null : createWebServices()));
  const services = (shared ?? fallback)!;
  const scoreValue = useScore(services.repository);

  const provided = (
    <ScoreContext.Provider value={scoreValue}>
      {children}
    </ScoreContext.Provider>
  );
  return fallback ? <ServicesProvider services={fallback}>{provided}</ServicesProvider> : provided;
};

/**
 * Хук для использования ScoreContext
 * Автоматически проверяет, что используется внутри Provider
 */
// eslint-disable-next-line react-refresh/only-export-components -- replaced by core storage (PLAN-IMPROVEMENTS.md, stage 1)
export const useScoreContext = (): UseScoreReturn => {
  const context = useContext(ScoreContext);
  
  if (context === undefined) {
    throw new Error('useScoreContext must be used within a ScoreProvider');
  }
  
  return context;
};

export default ScoreContext;

