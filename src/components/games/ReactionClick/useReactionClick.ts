import { useState, useEffect, useCallback, useRef } from 'react';
import { ROUNDS, TIMINGS } from '../../../utils/constants';
import { getRandomInt } from '../../../utils/randomUtils';
import { calculateReactionScore } from '../../../utils/gameUtils';

export type GameStatus = 'intro' | 'waiting' | 'ready' | 'tooEarly' | 'clicked' | 'results';

export interface ReactionClickState {
  status: GameStatus;
  currentAttempt: number;
  reactionTimes: number[];
  currentScore: number;
  tooEarlyCount: number;
}

export interface UseReactionClickReturn extends ReactionClickState {
  startGame: () => void;
  handleClick: () => void;
  playAgain: () => void;
  getAverageTime: () => number;
  getBestTime: () => number;
  getWorstTime: () => number;
}

function useReactionClick(): UseReactionClickReturn {
  const [status, setStatus] = useState<GameStatus>('intro');
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [currentScore, setCurrentScore] = useState(0);
  const [tooEarlyCount, setTooEarlyCount] = useState(0);

  const startTimeRef = useRef<number>(0);
  const timeoutRef = useRef<number | null>(null);

  const totalRounds = ROUNDS.REACTION_CLICK;

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const startNextRound = useCallback(() => {
    setStatus('waiting');

    // Random delay between REACTION_MIN and REACTION_MAX
    const delay = getRandomInt(TIMINGS.REACTION_MIN, TIMINGS.REACTION_MAX);

    timeoutRef.current = setTimeout(() => {
      setStatus('ready');
      startTimeRef.current = Date.now();
    }, delay) as unknown as number;
  }, []);

  const startGame = useCallback(() => {
    setStatus('waiting');
    setCurrentAttempt(0);
    setReactionTimes([]);
    setCurrentScore(0);
    setTooEarlyCount(0);
    startNextRound();
  }, [startNextRound]);

  const handleClick = useCallback(() => {
    if (status === 'intro' || status === 'results') {
      return;
    }

    if (status === 'waiting') {
      // Clicked too early
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setStatus('tooEarly');
      setTooEarlyCount(prev => prev + 1);
      
      // Check if this was the last attempt
      const nextAttempt = currentAttempt + 1;
      setCurrentAttempt(nextAttempt);
      
      // After 1 second, start next round or end game
      setTimeout(() => {
        if (nextAttempt >= totalRounds) {
          setStatus('results');
        } else {
          startNextRound();
        }
      }, 1000);
      return;
    }

    if (status === 'ready') {
      // Calculate reaction time
      const reactionTime = Date.now() - startTimeRef.current;
      const points = calculateReactionScore(reactionTime);

      setReactionTimes(prev => [...prev, reactionTime]);
      setCurrentScore(prev => prev + points);

      // Check if this was the last attempt BEFORE incrementing
      const nextAttempt = currentAttempt + 1;
      setCurrentAttempt(nextAttempt);

      // Show celebration briefly
      setStatus('clicked');

      // Brief pause before next round
      setTimeout(() => {
        if (nextAttempt >= totalRounds) {
          setStatus('results');
        } else {
          startNextRound();
        }
      }, 800);
    }

    if (status === 'tooEarly') {
      // Ignore clicks during "too early" message
      return;
    }
  }, [status, startNextRound]);

  const playAgain = useCallback(() => {
    startGame();
  }, [startGame]);

  const getAverageTime = useCallback(() => {
    if (reactionTimes.length === 0) return 0;
    const sum = reactionTimes.reduce((acc, time) => acc + time, 0);
    return Math.round(sum / reactionTimes.length);
  }, [reactionTimes]);

  const getBestTime = useCallback(() => {
    if (reactionTimes.length === 0) return 0;
    return Math.min(...reactionTimes);
  }, [reactionTimes]);

  const getWorstTime = useCallback(() => {
    if (reactionTimes.length === 0) return 0;
    return Math.max(...reactionTimes);
  }, [reactionTimes]);

  return {
    status,
    currentAttempt,
    reactionTimes,
    currentScore,
    tooEarlyCount,
    startGame,
    handleClick,
    playAgain,
    getAverageTime,
    getBestTime,
    getWorstTime,
  };
}

export default useReactionClick;

