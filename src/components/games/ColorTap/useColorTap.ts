import { useState, useCallback, useEffect, useRef } from 'react';
import { ROUNDS } from '../../../utils/constants';

export type GameStatus = 'intro' | 'playing' | 'results';
export type ColorType = 'green' | 'red';

export interface RoundResult {
  correct: boolean;
  time: number;
}

export interface ColorTapState {
  status: GameStatus;
  currentRound: number;
  currentColor: ColorType;
  correctAnswers: number;
  startTime: number;
  results: RoundResult[];
  currentScore: number;
}

export interface UseColorTapReturn extends ColorTapState {
  startGame: () => void;
  handleAnswer: (answer: boolean) => void;
  playAgain: () => void;
  getAccuracy: () => number;
  getAverageTime: () => number;
  getFastAnswers: () => number;
}

function useColorTap(): UseColorTapReturn {
  const [status, setStatus] = useState<GameStatus>('intro');
  const [currentRound, setCurrentRound] = useState(0);
  const [currentColor, setCurrentColor] = useState<ColorType>('green');
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [currentScore, setCurrentScore] = useState(0);

  const totalRounds = ROUNDS.COLOR_TAP;

  const generateNextColor = useCallback((): ColorType => {
    return Math.random() < 0.5 ? 'green' : 'red';
  }, []);

  const startNewRound = useCallback(() => {
    const newColor = generateNextColor();
    setCurrentColor(newColor);
    setStartTime(Date.now());
  }, [generateNextColor]);

  const startGame = useCallback(() => {
    setStatus('playing');
    setCurrentRound(0);
    setCorrectAnswers(0);
    setResults([]);
    setCurrentScore(0);
    startNewRound();
  }, [startNewRound]);

  const handleAnswer = useCallback((answer: boolean) => {
    if (status !== 'playing') return;

    const endTime = Date.now();
    const reactionTime = endTime - startTime;
    
    // Check if answer is correct
    // Green = YES (true), Red = NO (false)
    const expectedAnswer = currentColor === 'green';
    const isCorrect = answer === expectedAnswer;

    // Calculate score
    let points = 0;
    if (isCorrect) {
      points = 1;
      // Bonus for fast reaction (< 1 second)
      if (reactionTime < 1000) {
        points += 0.5;
      }
      setCorrectAnswers(prev => prev + 1);
    }

    setCurrentScore(prev => prev + points);
    setResults(prev => [...prev, { correct: isCorrect, time: reactionTime }]);

    const nextRound = currentRound + 1;
    setCurrentRound(nextRound);

    if (nextRound >= totalRounds) {
      setStatus('results');
    } else {
      // Short delay before next round
      setTimeout(() => {
        startNewRound();
      }, 300);
    }
  }, [status, startTime, currentColor, currentRound, totalRounds, startNewRound]);

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

  const getFastAnswers = useCallback(() => {
    return results.filter(r => r.correct && r.time < 1000).length;
  }, [results]);

  return {
    status,
    currentRound,
    currentColor,
    correctAnswers,
    startTime,
    results,
    currentScore,
    startGame,
    handleAnswer,
    playAgain,
    getAccuracy,
    getAverageTime,
    getFastAnswers,
  };
}

export default useColorTap;

