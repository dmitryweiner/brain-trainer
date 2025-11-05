import { useState, useCallback, useEffect, useRef } from 'react';
import type { Card, MemoryFlipState } from '../../../types/game.types';
import { GRID_SIZES } from '../../../utils/constants';
import { MEMORY_GAME_EMOJIS } from '../../../utils/emojiSets';
import { shuffleArray } from '../../../utils/randomUtils';

type GameStatus = 'intro' | 'playing' | 'level-complete' | 'results';

interface LevelStats {
  moves: number;
  score: number;
}

interface UseMemoryFlipReturn {
  status: GameStatus;
  level: 1 | 2 | 3 | 4;
  cards: Card[];
  flippedCards: number[];
  moves: number;
  elapsedTime: number;
  totalScore: number;
  levelStats: LevelStats[];
  startGame: () => void;
  handleCardClick: (index: number) => void;
  proceedToNextLevel: () => void;
  finishGame: () => void;
}

const LEVEL_CONFIG = {
  1: { gridKey: 'MEMORY_FLIP_L1' as const, baseScore: 10, optimalMoves: 5 },
  2: { gridKey: 'MEMORY_FLIP_L2' as const, baseScore: 20, optimalMoves: 10 },
  3: { gridKey: 'MEMORY_FLIP_L3' as const, baseScore: 30, optimalMoves: 15 },
  4: { gridKey: 'MEMORY_FLIP_L4' as const, baseScore: 40, optimalMoves: 20 },
};

export function useMemoryFlip(): UseMemoryFlipReturn {
  const [status, setStatus] = useState<GameStatus>('intro');
  const [state, setState] = useState<MemoryFlipState>({
    level: 1,
    cards: [],
    flippedCards: [],
    matchedPairs: 0,
    moves: 0,
    startTime: 0,
  });
  const [elapsedTime, setElapsedTime] = useState(0);
  const [levelStats, setLevelStats] = useState<LevelStats[]>([]);
  
  const timerRef = useRef<number | null>(null);
  const checkMatchTimeoutRef = useRef<number | null>(null);

  // Генерация карт для уровня
  const generateCards = useCallback((level: 1 | 2 | 3 | 4): Card[] => {
    const config = LEVEL_CONFIG[level];
    const gridSize = GRID_SIZES[config.gridKey];
    const totalCards = gridSize.rows * gridSize.cols;
    const pairsCount = totalCards / 2;

    // Выбираем случайные эмодзи
    const shuffledEmojis = shuffleArray([...MEMORY_GAME_EMOJIS]);
    const selectedEmojis = shuffledEmojis.slice(0, pairsCount);

    // Создаем пары
    const emojisWithPairs = [...selectedEmojis, ...selectedEmojis];
    const shuffledPairs = shuffleArray(emojisWithPairs);

    // Создаем карты
    return shuffledPairs.map((emoji, index) => ({
      id: index,
      emoji,
      isFlipped: false,
      isMatched: false,
    }));
  }, []);

  // Начало игры
  const startGame = useCallback(() => {
    const cards = generateCards(1);
    setState({
      level: 1,
      cards,
      flippedCards: [],
      matchedPairs: 0,
      moves: 0,
      startTime: Date.now(),
    });
    setStatus('playing');
    setElapsedTime(0);
    setLevelStats([]);
    
    // Запуск таймера
    timerRef.current = window.setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
  }, [generateCards]);

  // Переход на следующий уровень
  const proceedToNextLevel = useCallback(() => {
    const nextLevel = (state.level + 1) as 1 | 2 | 3 | 4;
    const cards = generateCards(nextLevel);
    setState({
      level: nextLevel,
      cards,
      flippedCards: [],
      matchedPairs: 0,
      moves: 0,
      startTime: Date.now(),
    });
    setStatus('playing');
  }, [state.level, generateCards]);

  // Завершение игры
  const finishGame = useCallback(() => {
    setStatus('results');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Подсчет очков за уровень
  const calculateLevelScore = useCallback((moves: number, level: 1 | 2 | 3 | 4): number => {
    const config = LEVEL_CONFIG[level];
    const penalty = Math.max(0, moves - config.optimalMoves);
    return Math.max(0, config.baseScore - penalty);
  }, []);

  // Обработка клика на карту
  const handleCardClick = useCallback((index: number) => {
    if (status !== 'playing') return;
    
    const card = state.cards[index];
    
    // Игнорируем клик, если карта уже открыта или уже найдена
    if (card.isFlipped || card.isMatched) return;
    
    // Игнорируем клик, если уже открыты 2 карты
    if (state.flippedCards.length >= 2) return;

    // Открываем карту
    const newFlippedCards = [...state.flippedCards, index];
    const newCards = state.cards.map((c, i) =>
      i === index ? { ...c, isFlipped: true } : c
    );

    setState((prev) => ({
      ...prev,
      cards: newCards,
      flippedCards: newFlippedCards,
    }));

    // Если открыты 2 карты - проверяем совпадение
    if (newFlippedCards.length === 2) {
      const [firstIndex, secondIndex] = newFlippedCards;
      const firstCard = newCards[firstIndex];
      const secondCard = newCards[secondIndex];

      // Увеличиваем счетчик ходов
      const newMoves = state.moves + 1;

      if (firstCard.emoji === secondCard.emoji) {
        // Совпадение!
        const newMatchedPairs = state.matchedPairs + 1;
        const totalPairs = state.cards.length / 2;

        setState((prev) => ({
          ...prev,
          cards: prev.cards.map((c, i) =>
            i === firstIndex || i === secondIndex ? { ...c, isMatched: true } : c
          ),
          flippedCards: [],
          matchedPairs: newMatchedPairs,
          moves: newMoves,
        }));

        // Проверяем, все ли пары найдены
        if (newMatchedPairs === totalPairs) {
          // Уровень завершен
          const levelScore = calculateLevelScore(newMoves, state.level);
          
          // Сохраняем статистику уровня
          setLevelStats((prev) => [...prev, { moves: newMoves, score: levelScore }]);
          
          if (state.level < 4) {
            setStatus('level-complete');
          } else {
            finishGame();
          }
        }
      } else {
        // Не совпадают - закрываем через задержку
        checkMatchTimeoutRef.current = window.setTimeout(() => {
          setState((prev) => ({
            ...prev,
            cards: prev.cards.map((c, i) =>
              i === firstIndex || i === secondIndex ? { ...c, isFlipped: false } : c
            ),
            flippedCards: [],
            moves: newMoves,
          }));
        }, 1000);
      }
    }
  }, [status, state, calculateLevelScore, finishGame]);

  // Очистка таймеров при размонтировании
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (checkMatchTimeoutRef.current) {
        clearTimeout(checkMatchTimeoutRef.current);
      }
    };
  }, []);

  const totalScore = levelStats.reduce((sum, stats) => sum + stats.score, 0);

  return {
    status,
    level: state.level,
    cards: state.cards,
    flippedCards: state.flippedCards,
    moves: state.moves,
    elapsedTime,
    totalScore,
    levelStats,
    startGame,
    handleCardClick,
    proceedToNextLevel,
    finishGame,
  };
}
