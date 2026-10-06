import { useEffect, useRef, useState } from 'react';
import type { GameSession } from '../core/types';
import { useGameHistoryContext } from '../context/GameHistoryContext';
import type { GameResult } from './useGameHistory';

/**
 * Records a v1 game's result once each time it reaches its results screen,
 * and returns the recorded session (null while playing). Replaces the
 * scoreAddedRef effect each v1 game carried — several never reset it, so
 * "play again" was not recorded.
 */
export function useRecordResult(
  done: boolean,
  makeResult: () => Omit<GameResult, 'timestamp'>,
): GameSession | null {
  const { addGameResult } = useGameHistoryContext();
  const [session, setSession] = useState<GameSession | null>(null);
  const recorded = useRef(false);
  const latest = useRef(makeResult);
  latest.current = makeResult;

  useEffect(() => {
    if (done && !recorded.current) {
      recorded.current = true;
      setSession(addGameResult(latest.current()));
    } else if (!done && recorded.current) {
      recorded.current = false;
      setSession(null);
    }
  }, [done, addGameResult]);

  return session;
}

export default useRecordResult;
