import { useState, useCallback } from 'react';
import { ROUNDS } from '../../../utils/constants';
import { ODD_ONE_OUT_EMOJIS } from '../../../utils/emojiSets';
import { getRandomInt, shuffleArray } from '../../../utils/randomUtils';

export type GameStatus = 'intro' | 'playing' | 'feedback' | 'results';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface RoundResult {
  correct: boolean;
  time: number;
  difficulty: Difficulty;
}

export interface OddOneOutState {
  status: GameStatus;
  currentRound: number;
  emojis: string[];
  oddOneIndex: number;
  correctAnswers: number;
  startTime: number;
  results: RoundResult[];
  currentScore: number;
  lastAnswerCorrect: boolean | null;
  currentDifficulty: Difficulty;
}

export interface UseOddOneOutReturn extends OddOneOutState {
  startGame: () => void;
  handleEmojiClick: (index: number) => void;
  playAgain: () => void;
  getAccuracy: () => number;
  getAverageTime: () => number;
}

function useOddOneOut(): UseOddOneOutReturn {
  const [status, setStatus] = useState<GameStatus>('intro');
  const [currentRound, setCurrentRound] = useState(0);
  const [emojis, setEmojis] = useState<string[]>([]);
  const [oddOneIndex, setOddOneIndex] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [currentScore, setCurrentScore] = useState(0);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [currentDifficulty, setCurrentDifficulty] = useState<Difficulty>('easy');

  const totalRounds = ROUNDS.ODD_ONE_OUT;

  const getDifficultyForRound = useCallback((round: number): Difficulty => {
    // Rounds 0-2 (1-3): easy
    // Rounds 3-6 (4-7): medium
    // Rounds 7-9 (8-10): hard
    if (round < 3) return 'easy';
    if (round < 7) return 'medium';
    return 'hard';
  }, []);

  const generateRound = useCallback((round: number) => {
    const difficulty = getDifficultyForRound(round);
    setCurrentDifficulty(difficulty);

    // Get sets for current difficulty
    const sets = ODD_ONE_OUT_EMOJIS[difficulty].sets;
    const randomSetIndex = getRandomInt(0, sets.length - 1);
    const selectedSet = [...sets[randomSetIndex]];

    // Shuffle the array so odd one is in random position
    const shuffled = shuffleArray(selectedSet);
    
    // Find the odd one (the one that appears once)
    const emojiCounts = new Map<string, number>();
    shuffled.forEach(emoji => {
      emojiCounts.set(emoji, (emojiCounts.get(emoji) || 0) + 1);
    });
    
    const oddEmoji = Array.from(emojiCounts.entries()).find(([_, count]) => count === 1)?.[0];
    const oddIndex = shuffled.findIndex(emoji => emoji === oddEmoji);

    setEmojis(shuffled);
    setOddOneIndex(oddIndex);
    setStartTime(Date.now());
  }, [getDifficultyForRound]);

  const startGame = useCallback(() => {
    setStatus('playing');
    setCurrentRound(0);
    setCorrectAnswers(0);
    setResults([]);
    setCurrentScore(0);
    setLastAnswerCorrect(null);
    generateRound(0);
  }, [generateRound]);

  const handleEmojiClick = useCallback((index: number) => {
    if (status !== 'playing') return;

    const endTime = Date.now();
    const reactionTime = endTime - startTime;
    
    // Check if clicked emoji is the odd one
    const isCorrect = index === oddOneIndex;

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
      difficulty: currentDifficulty
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
        generateRound(nextRound);
      }, 800);
    }
  }, [status, startTime, oddOneIndex, currentRound, totalRounds, currentDifficulty, generateRound]);

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
    emojis,
    oddOneIndex,
    correctAnswers,
    startTime,
    results,
    currentScore,
    lastAnswerCorrect,
    currentDifficulty,
    startGame,
    handleEmojiClick,
    playAgain,
    getAccuracy,
    getAverageTime,
  };
}

export default useOddOneOut;

