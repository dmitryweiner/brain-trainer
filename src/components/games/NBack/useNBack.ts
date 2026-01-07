import { useState, useCallback, useEffect, useRef } from 'react';
import { N_BACK_EMOJIS } from '../../../utils/emojiSets';
import { getRandomInt } from '../../../utils/randomUtils';
import { TIMINGS } from '../../../utils/constants';

type GameStatus = 'intro' | 'playing' | 'blockPause' | 'results';

interface UseNBackReturn {
  status: GameStatus;
  sequence: string[];
  currentIndex: number;
  currentBlock: number;
  currentEmoji: string | null;
  history: string[];
  hits: number;
  misses: number;
  falseAlarms: number;
  correctRejections: number;
  score: number;
  isMatch: boolean;
  canAnswer: boolean;
  startGame: () => void;
  handleMatch: () => void;
}

const N = 2; // 2-back
const ITEMS_PER_BLOCK = 20;
const TOTAL_BLOCKS = 3;

export function useNBack(): UseNBackReturn {
  const [status, setStatus] = useState<GameStatus>('intro');
  const [currentEmoji, setCurrentEmoji] = useState<string | null>(null);
  const [canAnswer, setCanAnswer] = useState(false);
  
  // Use refs for values that need to persist across closures
  const sequenceRef = useRef<string[]>([]);
  const currentIndexRef = useRef(-1);
  const currentBlockRef = useRef(1);
  const hitsRef = useRef(0);
  const missesRef = useRef(0);
  const falseAlarmsRef = useRef(0);
  const correctRejectionsRef = useRef(0);
  const answerGivenRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);
  
  // State for UI updates (derived from refs)
  const [, forceUpdate] = useState({});
  const triggerUpdate = useCallback(() => forceUpdate({}), []);

  // Генерация последовательности для одного блока
  const generateSequence = useCallback((): string[] => {
    const sequence: string[] = [];
    
    for (let i = 0; i < ITEMS_PER_BLOCK; i++) {
      if (i < N) {
        const randomEmoji = N_BACK_EMOJIS[getRandomInt(0, N_BACK_EMOJIS.length - 1)];
        sequence.push(randomEmoji);
      } else {
        const shouldMatch = Math.random() < 0.3;
        
        if (shouldMatch) {
          sequence.push(sequence[i - N]);
        } else {
          let randomEmoji;
          do {
            randomEmoji = N_BACK_EMOJIS[getRandomInt(0, N_BACK_EMOJIS.length - 1)];
          } while (randomEmoji === sequence[i - N]);
          sequence.push(randomEmoji);
        }
      }
    }
    
    return sequence;
  }, []);

  // Проверка, является ли текущий элемент совпадением
  const checkIsMatch = useCallback((index: number, sequence: string[]): boolean => {
    if (index < N) return false;
    return sequence[index] === sequence[index - N];
  }, []);

  // Clear any pending timeout
  const clearPendingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Show next emoji in sequence
  const showNextEmoji = useCallback(() => {
    if (!isPlayingRef.current) return;

    const sequence = sequenceRef.current;
    const nextIndex = currentIndexRef.current + 1;

    // Check previous answer if we're past index 0
    if (currentIndexRef.current >= 0 && !answerGivenRef.current) {
      const wasMatch = checkIsMatch(currentIndexRef.current, sequence);
      if (wasMatch) {
        missesRef.current += 1;
      } else {
        correctRejectionsRef.current += 1;
      }
    }

    if (nextIndex >= sequence.length) {
      // Block completed
      if (currentBlockRef.current < TOTAL_BLOCKS) {
        // Transition to next block
        isPlayingRef.current = false;
        setStatus('blockPause');
        setCurrentEmoji(null);
        setCanAnswer(false);
        triggerUpdate();

        timeoutRef.current = window.setTimeout(() => {
          const nextSequence = generateSequence();
          sequenceRef.current = nextSequence;
          currentIndexRef.current = -1;
          currentBlockRef.current += 1;
          answerGivenRef.current = false;
          isPlayingRef.current = true;
          setStatus('playing');
          triggerUpdate();
          
          // Start showing next sequence
          timeoutRef.current = window.setTimeout(showNextEmoji, 500);
        }, TIMINGS.BLOCK_PAUSE);
      } else {
        // Game finished
        isPlayingRef.current = false;
        setStatus('results');
        setCurrentEmoji(null);
        setCanAnswer(false);
        triggerUpdate();
      }
      return;
    }

    // Show next emoji
    currentIndexRef.current = nextIndex;
    setCurrentEmoji(sequence[nextIndex]);
    setCanAnswer(nextIndex >= N); // Can only answer after N items
    answerGivenRef.current = false;
    triggerUpdate();

    // Schedule next emoji
    timeoutRef.current = window.setTimeout(showNextEmoji, TIMINGS.N_BACK_INTERVAL);
  }, [checkIsMatch, generateSequence, triggerUpdate]);

  // Start game
  const startGame = useCallback(() => {
    clearPendingTimeout();
    
    const sequence = generateSequence();
    sequenceRef.current = sequence;
    currentIndexRef.current = -1;
    currentBlockRef.current = 1;
    hitsRef.current = 0;
    missesRef.current = 0;
    falseAlarmsRef.current = 0;
    correctRejectionsRef.current = 0;
    answerGivenRef.current = false;
    isPlayingRef.current = true;
    
    setCurrentEmoji(null);
    setCanAnswer(false);
    setStatus('playing');
    triggerUpdate();

    // Start showing sequence after a short delay
    timeoutRef.current = window.setTimeout(showNextEmoji, 500);
  }, [clearPendingTimeout, generateSequence, showNextEmoji, triggerUpdate]);

  // Handle match button press
  const handleMatch = useCallback(() => {
    if (!canAnswer || answerGivenRef.current || !isPlayingRef.current) return;

    answerGivenRef.current = true;
    const isMatch = checkIsMatch(currentIndexRef.current, sequenceRef.current);

    if (isMatch) {
      hitsRef.current += 1;
    } else {
      falseAlarmsRef.current += 1;
    }
    triggerUpdate();
  }, [canAnswer, checkIsMatch, triggerUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPendingTimeout();
      isPlayingRef.current = false;
    };
  }, [clearPendingTimeout]);

  // Calculate derived values
  const sequence = sequenceRef.current;
  const currentIndex = currentIndexRef.current;
  const currentBlock = currentBlockRef.current;
  const hits = hitsRef.current;
  const misses = missesRef.current;
  const falseAlarms = falseAlarmsRef.current;
  const correctRejections = correctRejectionsRef.current;

  const history = currentIndex >= 0
    ? sequence.slice(Math.max(0, currentIndex - 2), currentIndex)
    : [];

  const isMatch = currentIndex >= N && checkIsMatch(currentIndex, sequence);
  const score = hits * 1 + correctRejections * 0.5;

  return {
    status,
    sequence,
    currentIndex,
    currentBlock,
    currentEmoji,
    history,
    hits,
    misses,
    falseAlarms,
    correctRejections,
    score,
    isMatch,
    canAnswer,
    startGame,
    handleMatch,
  };
}
