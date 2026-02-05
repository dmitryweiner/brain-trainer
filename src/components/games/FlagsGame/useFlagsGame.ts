import { useState, useCallback, useRef } from 'react';
import { 
  getAllCountries, 
  getDistractors,
  type CountryData 
} from './countryData';

export type GameMode = 'flag-to-country' | 'country-to-flag';
export type GameStatus = 'intro' | 'mode-select' | 'playing' | 'feedback' | 'results';

const TOTAL_ROUNDS = 5;
const BASE_POINTS = 10;
const MAX_TIME_BONUS = 10;
const FAST_ANSWER_THRESHOLD = 2000; // 2 seconds for full bonus

export interface RoundResult {
  correct: boolean;
  time: number;
  points: number;
}

export interface UseFlagsGameReturn {
  status: GameStatus;
  mode: GameMode | null;
  currentRound: number;
  totalRounds: number;
  correctCountry: CountryData | null;
  options: CountryData[];
  lastAnswerCorrect: boolean | null;
  roundResults: RoundResult[];
  totalScore: number;
  correctAnswers: number;
  averageTime: number;
  selectMode: (mode: GameMode) => void;
  handleAnswer: (code: string) => void;
  startGame: () => void;
  resetGame: () => void;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function calculateTimeBonus(timeMs: number): number {
  if (timeMs <= FAST_ANSWER_THRESHOLD) {
    return MAX_TIME_BONUS;
  }
  // Linear decrease from MAX_TIME_BONUS to 0 over 8 seconds
  const bonus = Math.max(0, MAX_TIME_BONUS - (timeMs - FAST_ANSWER_THRESHOLD) / 800);
  return Math.round(bonus);
}

export function useFlagsGame(): UseFlagsGameReturn {
  const [status, setStatus] = useState<GameStatus>('intro');
  const [mode, setMode] = useState<GameMode | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [correctCountry, setCorrectCountry] = useState<CountryData | null>(null);
  const [options, setOptions] = useState<CountryData[]>([]);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  
  const roundStartTimeRef = useRef<number>(0);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const usedCountriesRef = useRef<Set<string>>(new Set());

  const setupRound = useCallback(() => {
    const allCountries = getAllCountries();
    
    // Get a country that hasn't been used in this game session
    const availableCountries = allCountries.filter(
      c => !usedCountriesRef.current.has(c.code)
    );
    
    // If we've used all countries, reset the used set
    if (availableCountries.length === 0) {
      usedCountriesRef.current.clear();
    }
    
    const countriesToChooseFrom = availableCountries.length > 0 
      ? availableCountries 
      : allCountries;
    
    const randomIndex = Math.floor(Math.random() * countriesToChooseFrom.length);
    const correct = countriesToChooseFrom[randomIndex];
    
    usedCountriesRef.current.add(correct.code);
    
    // Get 3 distractors
    const distractors = getDistractors(correct.code, 3);
    
    // Shuffle all 4 options
    const allOptions = shuffleArray([correct, ...distractors]);
    
    setCorrectCountry(correct);
    setOptions(allOptions);
    setLastAnswerCorrect(null);
    roundStartTimeRef.current = Date.now();
  }, []);

  const startGame = useCallback(() => {
    setStatus('mode-select');
    setCurrentRound(0);
    setRoundResults([]);
    setTotalScore(0);
    setLastAnswerCorrect(null);
    usedCountriesRef.current.clear();
  }, []);

  const selectMode = useCallback((selectedMode: GameMode) => {
    setMode(selectedMode);
    setCurrentRound(1);
    setStatus('playing');
    setupRound();
  }, [setupRound]);

  const handleAnswer = useCallback((selectedCode: string) => {
    if (status !== 'playing' || !correctCountry) return;
    
    const endTime = Date.now();
    const responseTime = endTime - roundStartTimeRef.current;
    const isCorrect = selectedCode === correctCountry.code;
    
    let points = 0;
    if (isCorrect) {
      const timeBonus = calculateTimeBonus(responseTime);
      points = BASE_POINTS + timeBonus;
      setTotalScore(prev => prev + points);
    }
    
    const result: RoundResult = {
      correct: isCorrect,
      time: responseTime,
      points,
    };
    
    setRoundResults(prev => [...prev, result]);
    setLastAnswerCorrect(isCorrect);
    setStatus('feedback');
    
    // Clear any existing timeout
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    
    // Show feedback for 1.5 seconds, then proceed
    feedbackTimeoutRef.current = window.setTimeout(() => {
      if (currentRound >= TOTAL_ROUNDS) {
        setStatus('results');
      } else {
        setCurrentRound(prev => prev + 1);
        setStatus('playing');
        setupRound();
      }
    }, 1500);
  }, [status, correctCountry, currentRound, setupRound]);

  const resetGame = useCallback(() => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    setStatus('intro');
    setMode(null);
    setCurrentRound(0);
    setCorrectCountry(null);
    setOptions([]);
    setLastAnswerCorrect(null);
    setRoundResults([]);
    setTotalScore(0);
    usedCountriesRef.current.clear();
  }, []);

  const correctAnswers = roundResults.filter(r => r.correct).length;
  const averageTime = roundResults.length > 0
    ? Math.round(roundResults.reduce((sum, r) => sum + r.time, 0) / roundResults.length)
    : 0;

  return {
    status,
    mode,
    currentRound,
    totalRounds: TOTAL_ROUNDS,
    correctCountry,
    options,
    lastAnswerCorrect,
    roundResults,
    totalScore,
    correctAnswers,
    averageTime,
    selectMode,
    handleAnswer,
    startGame,
    resetGame,
  };
}

export default useFlagsGame;
