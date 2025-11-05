import { useState, useCallback, useEffect, useRef } from 'react';
import type { NBackState } from '../../../types/game.types';
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
  const [state, setState] = useState<NBackState>({
    sequence: [],
    currentIndex: -1,
    currentBlock: 1,
    hits: 0,
    misses: 0,
    falseAlarms: 0,
  });
  const [correctRejections, setCorrectRejections] = useState(0);
  const [currentEmoji, setCurrentEmoji] = useState<string | null>(null);
  const [canAnswer, setCanAnswer] = useState(false);

  const intervalRef = useRef<number | null>(null);
  const answerGivenRef = useRef(false);

  // Генерация последовательности для одного блока
  const generateSequence = useCallback((): string[] => {
    const sequence: string[] = [];
    
    for (let i = 0; i < ITEMS_PER_BLOCK; i++) {
      if (i < N) {
        // Первые N элементов - случайные
        const randomEmoji = N_BACK_EMOJIS[getRandomInt(0, N_BACK_EMOJIS.length - 1)];
        sequence.push(randomEmoji);
      } else {
        // Остальные элементы: с некоторой вероятностью совпадают с N-м предыдущим
        const shouldMatch = Math.random() < 0.3; // 30% вероятность совпадения
        
        if (shouldMatch) {
          sequence.push(sequence[i - N]);
        } else {
          // Выбираем случайный эмодзи, но не тот, что был N шагов назад
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

  // Начало игры
  const startGame = useCallback(() => {
    const sequence = generateSequence();
    
    setState({
      sequence,
      currentIndex: -1,
      currentBlock: 1,
      hits: 0,
      misses: 0,
      falseAlarms: 0,
    });
    setCorrectRejections(0);
    setCurrentEmoji(null);
    setCanAnswer(false);
    setStatus('playing');
    answerGivenRef.current = false;
  }, [generateSequence]);

  // Обработка нажатия кнопки "Совпадает"
  const handleMatch = useCallback(() => {
    if (!canAnswer || answerGivenRef.current) return;

    answerGivenRef.current = true;
    const isMatch = checkIsMatch(state.currentIndex, state.sequence);

    if (isMatch) {
      // Правильное нажатие (HIT)
      setState((prev) => ({
        ...prev,
        hits: prev.hits + 1,
      }));
    } else {
      // Ложная тревога (FALSE ALARM)
      setState((prev) => ({
        ...prev,
        falseAlarms: prev.falseAlarms + 1,
      }));
    }
  }, [canAnswer, state.currentIndex, state.sequence, checkIsMatch]);

  // Автоматический показ последовательности
  useEffect(() => {
    if (status === 'playing' && state.sequence.length > 0) {
      const showNextEmoji = () => {
        const nextIndex = state.currentIndex + 1;

        if (nextIndex >= state.sequence.length) {
          // Блок завершен
          if (state.currentBlock < TOTAL_BLOCKS) {
            // Переход к следующему блоку
            setStatus('blockPause');
            setCurrentEmoji(null);
            setCanAnswer(false);

            setTimeout(() => {
              const nextSequence = generateSequence();
              setState((prev) => ({
                ...prev,
                sequence: nextSequence,
                currentIndex: -1,
                currentBlock: prev.currentBlock + 1,
              }));
              setStatus('playing');
            }, TIMINGS.BLOCK_PAUSE);
          } else {
            // Игра завершена
            setStatus('results');
            setCurrentEmoji(null);
            setCanAnswer(false);
          }
          return;
        }

        // Проверяем предыдущий элемент, если не было ответа
        if (state.currentIndex >= 0 && !answerGivenRef.current) {
          const wasMatch = checkIsMatch(state.currentIndex, state.sequence);
          if (wasMatch) {
            // Пропуск совпадения (MISS)
            setState((prev) => ({
              ...prev,
              misses: prev.misses + 1,
            }));
          } else {
            // Правильный пропуск (CORRECT REJECTION)
            setCorrectRejections((prev) => prev + 1);
          }
        }

        // Показываем следующий элемент
        setState((prev) => ({
          ...prev,
          currentIndex: nextIndex,
        }));
        setCurrentEmoji(state.sequence[nextIndex]);
        setCanAnswer(true);
        answerGivenRef.current = false;

        intervalRef.current = window.setTimeout(showNextEmoji, TIMINGS.N_BACK_INTERVAL);
      };

      // Запускаем показ первого элемента
      if (state.currentIndex === -1) {
        intervalRef.current = window.setTimeout(showNextEmoji, 500);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [status, state, generateSequence, checkIsMatch]);

  // История последних 3 элементов
  const history = state.currentIndex >= 0
    ? state.sequence.slice(Math.max(0, state.currentIndex - 2), state.currentIndex)
    : [];

  // Текущий элемент совпадает с N-м предыдущим?
  const isMatch = state.currentIndex >= N && checkIsMatch(state.currentIndex, state.sequence);

  // Подсчет очков
  const score = state.hits * 1 + correctRejections * 0.5;

  return {
    status,
    sequence: state.sequence,
    currentIndex: state.currentIndex,
    currentBlock: state.currentBlock,
    currentEmoji,
    history,
    hits: state.hits,
    misses: state.misses,
    falseAlarms: state.falseAlarms,
    correctRejections,
    score,
    isMatch,
    canAnswer,
    startGame,
    handleMatch,
  };
}

