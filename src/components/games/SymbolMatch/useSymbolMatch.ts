import { useState, useCallback } from 'react';
import { ROUNDS } from '../../../utils/constants';
import { SYMBOL_MATCH_EMOJIS } from '../../../utils/emojiSets';
import { getRandomInt } from '../../../utils/randomUtils';

export type GameStatus = 'intro' | 'playing' | 'feedback' | 'results';

export interface RoundResult {
  correct: boolean;
  time: number;
  emoji1: string;
  emoji2: string;
  userAnswer: boolean;
}

export interface SymbolMatchState {
  status: GameStatus;
  currentRound: number;
  emoji1: string;
  emoji2: string;
  correctAnswers: number;
  startTime: number;
  results: RoundResult[];
  currentScore: number;
  lastAnswerCorrect: boolean | null;
}

export interface UseSymbolMatchReturn extends SymbolMatchState {
  startGame: () => void;
  handleAnswer: (answer: boolean) => void;
  playAgain: () => void;
  getAccuracy: () => number;
  getAverageTime: () => number;
}

function useSymbolMatch(): UseSymbolMatchReturn {
  const [status, setStatus] = useState<GameStatus>('intro');
  const [currentRound, setCurrentRound] = useState(0);
  const [emoji1, setEmoji1] = useState('😀');
  const [emoji2, setEmoji2] = useState('😀');
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [currentScore, setCurrentScore] = useState(0);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);

  const totalRounds = ROUNDS.SYMBOL_MATCH;

  const generateEmojis = useCallback(() => {
    // 50% chance of match
    const shouldMatch = Math.random() < 0.5;
    
    const randomIndex1 = getRandomInt(0, SYMBOL_MATCH_EMOJIS.length - 1);
    const newEmoji1 = SYMBOL_MATCH_EMOJIS[randomIndex1];
    
    let newEmoji2: string;
    if (shouldMatch) {
      newEmoji2 = newEmoji1;
    } else {
      // Get a different emoji
      let randomIndex2 = getRandomInt(0, SYMBOL_MATCH_EMOJIS.length - 1);
      while (randomIndex2 === randomIndex1) {
        randomIndex2 = getRandomInt(0, SYMBOL_MATCH_EMOJIS.length - 1);
      }
      newEmoji2 = SYMBOL_MATCH_EMOJIS[randomIndex2];
    }
    
    return { newEmoji1, newEmoji2 };
  }, []);

  const startNewRound = useCallback(() => {
    const { newEmoji1, newEmoji2 } = generateEmojis();
    setEmoji1(newEmoji1);
    setEmoji2(newEmoji2);
    setStartTime(Date.now());
  }, [generateEmojis]);

  const startGame = useCallback(() => {
    setStatus('playing');
    setCurrentRound(0);
    setCorrectAnswers(0);
    setResults([]);
    setCurrentScore(0);
    setLastAnswerCorrect(null);
    startNewRound();
  }, [startNewRound]);

  const handleAnswer = useCallback((answer: boolean) => {
    if (status !== 'playing') return;

    const endTime = Date.now();
    const reactionTime = endTime - startTime;
    
    // Check if answer is correct
    const actualMatch = emoji1 === emoji2;
    const isCorrect = answer === actualMatch;

    // Calculate score
    let points = 0;
    if (isCorrect) {
      points = 1;
      setCorrectAnswers(prev => prev + 1);
    }

    setCurrentScore(prev => prev + points);
    setResults(prev => [...prev, { 
      correct: isCorrect, 
      time: reactionTime,
      emoji1,
      emoji2,
      userAnswer: answer
    }]);
    setLastAnswerCorrect(isCorrect);

    const nextRound = currentRound + 1;
    setCurrentRound(nextRound);

    // Show feedback state
    setStatus('feedback');

    if (nextRound >= totalRounds) {
      // Show feedback, then go to results
      setTimeout(() => {
        setStatus('results');
      }, 800);
    } else {
      // Show feedback, then start next round
      setTimeout(() => {
        setStatus('playing');
        startNewRound();
      }, 800);
    }
  }, [status, startTime, emoji1, emoji2, currentRound, totalRounds, startNewRound]);

  const playAgain = useCallback(() => {
    startGame();
  }, [startGame]);

  const getAccuracy = useCallback(() => {
    if (results.length === 0) return 0;
    const correct = results.filter(r => r.correct).length;
    return Math.round((correct / results.length) * 100);
  }, [results]);

  const getAverageTime = useCallback(() => {
    if (results.length === 0) return 0;
    const sum = results.reduce((acc, r) => acc + r.time, 0);
    return Math.round(sum / results.length);
  }, [results]);

  return {
    status,
    currentRound,
    emoji1,
    emoji2,
    correctAnswers,
    startTime,
    results,
    currentScore,
    lastAnswerCorrect,
    startGame,
    handleAnswer,
    playAgain,
    getAccuracy,
    getAverageTime,
  };
}

export default useSymbolMatch;

