import { useState, useCallback, useEffect, useRef } from 'react';
import { ROUNDS, GRID_SIZES } from '../../../utils/constants';
import { getRandomInt } from '../../../utils/randomUtils';

export type GameStatus = 'intro' | 'playing' | 'feedback' | 'results';

export interface RoundResult {
  time: number;
  points: number;
}

export interface HiddenNumberState {
  status: GameStatus;
  currentRound: number;
  targetPosition: number;
  targetNumber: number;
  gridNumbers: number[];
  startTime: number;
  times: number[];
  currentScore: number;
  lastRoundTime: number | null;
  lastRoundPoints: number | null;
}

export interface UseHiddenNumberReturn extends HiddenNumberState {
  startGame: () => void;
  handleCellClick: (index: number) => void;
  playAgain: () => void;
  getAverageTime: () => number;
  getBestTime: () => number;
  getWorstTime: () => number;
  gridSize: { rows: number; cols: number };
  totalCells: number;
}

function useHiddenNumber(): UseHiddenNumberReturn {
  const [status, setStatus] = useState<GameStatus>('intro');
  const [currentRound, setCurrentRound] = useState(0);
  const [targetPosition, setTargetPosition] = useState(0);
  const [targetNumber, setTargetNumber] = useState(1);
  const [gridNumbers, setGridNumbers] = useState<number[]>([]);
  const [startTime, setStartTime] = useState(0);
  const [times, setTimes] = useState<number[]>([]);
  const [currentScore, setCurrentScore] = useState(0);
  const [lastRoundTime, setLastRoundTime] = useState<number | null>(null);
  const [lastRoundPoints, setLastRoundPoints] = useState<number | null>(null);

  const totalRounds = ROUNDS.HIDDEN_NUMBER;
  const gridSize = GRID_SIZES.HIDDEN_NUMBER;
  const totalCells = gridSize.rows * gridSize.cols;

  const calculatePoints = useCallback((time: number): number => {
    if (time < 3000) return 3;
    if (time < 5000) return 2;
    return 1;
  }, []);

  const generateRound = useCallback(() => {
    const position = getRandomInt(0, totalCells - 1);
    const number = getRandomInt(1, 9);
    
    // Generate random numbers for all cells, excluding target number
    const numbers = Array.from({ length: totalCells }, () => {
      let randomNum = getRandomInt(1, 9);
      // Make sure it's not the target number
      while (randomNum === number) {
        randomNum = getRandomInt(1, 9);
      }
      return randomNum;
    });
    
    // Place target number at target position
    numbers[position] = number;
    
    setTargetPosition(position);
    setTargetNumber(number);
    setGridNumbers(numbers);
    setStartTime(Date.now());
  }, [totalCells]);

  const startGame = useCallback(() => {
    setStatus('playing');
    setCurrentRound(0);
    setTimes([]);
    setCurrentScore(0);
    setLastRoundTime(null);
    setLastRoundPoints(null);
    generateRound();
  }, [generateRound]);

  const handleCellClick = useCallback((index: number) => {
    if (status !== 'playing') return;

    // Check if clicked correct cell
    if (index !== targetPosition) return;

    const endTime = Date.now();
    const reactionTime = endTime - startTime;
    const points = calculatePoints(reactionTime);

    setTimes(prev => [...prev, reactionTime]);
    setCurrentScore(prev => prev + points);
    setLastRoundTime(reactionTime);
    setLastRoundPoints(points);

    const nextRound = currentRound + 1;
    setCurrentRound(nextRound);

    // Show feedback state
    setStatus('feedback');

    if (nextRound >= totalRounds) {
      // Show feedback, then go to results
      setTimeout(() => {
        setStatus('results');
      }, 1000);
    } else {
      // Show feedback, then start next round
      setTimeout(() => {
        setStatus('playing');
        generateRound();
      }, 1000);
    }
  }, [status, targetPosition, startTime, calculatePoints, currentRound, totalRounds, generateRound]);

  const playAgain = useCallback(() => {
    startGame();
  }, [startGame]);

  const getAverageTime = useCallback(() => {
    if (times.length === 0) return 0;
    const sum = times.reduce((acc, time) => acc + time, 0);
    return Math.round(sum / times.length);
  }, [times]);

  const getBestTime = useCallback(() => {
    if (times.length === 0) return 0;
    return Math.min(...times);
  }, [times]);

  const getWorstTime = useCallback(() => {
    if (times.length === 0) return 0;
    return Math.max(...times);
  }, [times]);

  return {
    status,
    currentRound,
    targetPosition,
    targetNumber,
    gridNumbers,
    startTime,
    times,
    currentScore,
    lastRoundTime,
    lastRoundPoints,
    startGame,
    handleCellClick,
    playAgain,
    getAverageTime,
    getBestTime,
    getWorstTime,
    gridSize,
    totalCells,
  };
}

export default useHiddenNumber;

