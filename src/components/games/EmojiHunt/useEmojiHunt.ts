import { useState, useCallback } from 'react';
import { ROUNDS } from '../../../utils/constants';
import { getRandomInt } from '../../../utils/randomUtils';

export type GameStatus = 'intro' | 'playing' | 'feedback' | 'results';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface RoundResult {
  correct: boolean;
  time: number;
  difficulty: Difficulty;
  gridSize: number;
}

// Наборы эмодзи по сложности
const EMOJI_SETS = {
  // Легко: разные категории, легко различимые
  easy: {
    distractors: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🥝', '🍑', '🥭', '🍒'],
    targets: ['🐶', '🐱', '🐭', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁'],
  },
  // Средне: одна категория (смайлики), заметная разница
  medium: {
    distractors: ['😀', '😃', '😄', '😁', '😊', '🙂', '😇', '😉', '😌', '😍', '🥰', '😘'],
    targets: ['😢', '😭', '😤', '😠', '😡', '🤬', '😰', '😨', '😱', '🥺'],
  },
  // Сложно: очень похожие эмодзи
  hard: {
    distractors: ['🌕', '🌖', '🌗', '🌘', '🌑', '🌒', '🌓', '🌔', '🌝', '🌚'],
    targets: ['🌛', '🌜'],
    // Или сердца
    hearts: {
      distractors: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💗', '💖', '💝'],
      targets: ['💔', '❣️'],
    },
  },
};

interface UseEmojiHuntReturn {
  status: GameStatus;
  currentRound: number;
  grid: string[];
  gridSize: number;
  targetEmoji: string;
  correctAnswers: number;
  results: RoundResult[];
  currentScore: number;
  lastAnswerCorrect: boolean | null;
  currentDifficulty: Difficulty;
  startGame: () => void;
  handleCellClick: (index: number) => void;
  playAgain: () => void;
  getAccuracy: () => number;
  getAverageTime: () => number;
}

function useEmojiHunt(): UseEmojiHuntReturn {
  const [status, setStatus] = useState<GameStatus>('intro');
  const [currentRound, setCurrentRound] = useState(0);
  const [grid, setGrid] = useState<string[]>([]);
  const [gridSize, setGridSize] = useState(3);
  const [targetEmoji, setTargetEmoji] = useState('');
  const [targetIndex, setTargetIndex] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [currentScore, setCurrentScore] = useState(0);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [currentDifficulty, setCurrentDifficulty] = useState<Difficulty>('easy');

  const totalRounds = ROUNDS.EMOJI_HUNT;

  const getDifficultyForRound = useCallback((round: number): { difficulty: Difficulty; size: number } => {
    // Раунды 0-2 (1-3): easy, 5x5
    // Раунды 3-5 (4-6): medium, 6x6
    // Раунды 6-9 (7-10): hard, 8x8
    if (round < 3) return { difficulty: 'easy', size: 5 };
    if (round < 6) return { difficulty: 'medium', size: 6 };
    return { difficulty: 'hard', size: 8 };
  }, []);

  const generateRound = useCallback((round: number) => {
    const { difficulty, size } = getDifficultyForRound(round);
    setCurrentDifficulty(difficulty);
    setGridSize(size);

    const totalCells = size * size;
    let distractors: string[];
    let targets: string[];

    if (difficulty === 'easy') {
      distractors = [...EMOJI_SETS.easy.distractors];
      targets = [...EMOJI_SETS.easy.targets];
    } else if (difficulty === 'medium') {
      distractors = [...EMOJI_SETS.medium.distractors];
      targets = [...EMOJI_SETS.medium.targets];
    } else {
      // Hard: случайно выбираем луны или сердца
      if (Math.random() > 0.5) {
        distractors = [...EMOJI_SETS.hard.distractors];
        targets = [...EMOJI_SETS.hard.targets];
      } else {
        distractors = [...EMOJI_SETS.hard.hearts.distractors];
        targets = [...EMOJI_SETS.hard.hearts.targets];
      }
    }

    // Выбираем целевой эмодзи
    const target = targets[getRandomInt(0, targets.length - 1)];
    setTargetEmoji(target);
    
    // Создаем сетку с случайными дистракторами
    const newGrid: string[] = [];
    for (let i = 0; i < totalCells; i++) {
      // Каждая ячейка получает случайный дистрактор
      const randomDistractor = distractors[getRandomInt(0, distractors.length - 1)];
      newGrid.push(randomDistractor);
    }

    // Размещаем целевой эмодзи в случайную позицию
    const targetPos = getRandomInt(0, totalCells - 1);
    newGrid[targetPos] = target;
    setTargetIndex(targetPos);

    setGrid(newGrid);
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

  const handleCellClick = useCallback((index: number) => {
    if (status !== 'playing') return;

    const endTime = Date.now();
    const reactionTime = endTime - startTime;
    
    const isCorrect = index === targetIndex;

    let points = 0;
    if (isCorrect) {
      // Бонус за скорость и сложность
      const basePoints = gridSize; // больше сетка = больше очков
      const timeBonus = Math.max(0, Math.floor((3000 - reactionTime) / 500));
      points = basePoints + timeBonus;
      setCorrectAnswers(prev => prev + 1);
    }

    setCurrentScore(prev => prev + points);
    setResults(prev => [...prev, {
      correct: isCorrect,
      time: reactionTime,
      difficulty: currentDifficulty,
      gridSize,
    }]);
    setLastAnswerCorrect(isCorrect);

    const nextRound = currentRound + 1;
    setCurrentRound(nextRound);

    setStatus('feedback');

    if (nextRound >= totalRounds) {
      setTimeout(() => {
        setStatus('results');
      }, 800);
    } else {
      setTimeout(() => {
        setStatus('playing');
        generateRound(nextRound);
      }, 800);
    }
  }, [status, startTime, targetIndex, currentRound, totalRounds, currentDifficulty, gridSize, generateRound]);

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
    grid,
    gridSize,
    targetEmoji,
    correctAnswers,
    results,
    currentScore,
    lastAnswerCorrect,
    currentDifficulty,
    startGame,
    handleCellClick,
    playAgain,
    getAccuracy,
    getAverageTime,
  };
}

export default useEmojiHunt;

