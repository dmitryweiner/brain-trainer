import { useState, useCallback, useEffect, useRef } from 'react';
import type { SequenceRecallState } from '../../../types/game.types';
import { MEMORY_GAME_EMOJIS, SEQUENCE_OPTIONS } from '../../../utils/emojiSets';
import { TIMINGS } from '../../../utils/constants';
import { shuffleArray } from '../../../utils/randomUtils';

type GameStatus = 'intro' | 'showing' | 'input' | 'feedback' | 'results';

interface UseSequenceRecallReturn {
  status: GameStatus;
  sequence: string[];
  userSequence: string[];
  options: string[];
  currentLength: number;
  showingIndex: number;
  currentEmoji: string | null;
  totalScore: number;
  correctSequences: number;
  lastAnswerCorrect: boolean;
  startGame: () => void;
  handleOptionClick: (emoji: string) => void;
}

const INITIAL_LENGTH = 3;
const MAX_LENGTH = 6;

export function useSequenceRecall(): UseSequenceRecallReturn {
  const [status, setStatus] = useState<GameStatus>('intro');
  const [state, setState] = useState<SequenceRecallState>({
    sequence: [],
    userSequence: [],
    currentLength: INITIAL_LENGTH,
    phase: 'showing',
    showingIndex: 0,
  });
  const [options, setOptions] = useState<string[]>([]);
  const [currentEmoji, setCurrentEmoji] = useState<string | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [correctSequences, setCorrectSequences] = useState(0);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(true);

  const showingTimeoutRef = useRef<number | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);

  // Генерация последовательности
  const generateSequence = useCallback((length: number): string[] => {
    const shuffled = shuffleArray([...MEMORY_GAME_EMOJIS]);
    return shuffled.slice(0, length);
  }, []);

  // Генерация вариантов для выбора
  const generateOptions = useCallback((sequence: string[]): string[] => {
    // Берем все эмодзи из последовательности
    const sequenceSet = new Set(sequence);
    const optionsArray = [...sequenceSet];

    // Добавляем дополнительные варианты из SEQUENCE_OPTIONS
    const availableOptions = SEQUENCE_OPTIONS.filter(
      (opt) => !sequenceSet.has(opt)
    );
    const shuffledAvailable = shuffleArray(availableOptions);

    // Добавляем варианты до 8 штук
    while (optionsArray.length < 8 && shuffledAvailable.length > 0) {
      optionsArray.push(shuffledAvailable.pop()!);
    }

    // Перемешиваем варианты
    return shuffleArray(optionsArray);
  }, []);

  // Начало игры
  const startGame = useCallback(() => {
    const sequence = generateSequence(INITIAL_LENGTH);
    const opts = generateOptions(sequence);

    setState({
      sequence,
      userSequence: [],
      currentLength: INITIAL_LENGTH,
      phase: 'showing',
      showingIndex: 0,
    });
    setOptions(opts);
    setStatus('showing');
    setTotalScore(0);
    setCorrectSequences(0);
    setLastAnswerCorrect(true);
    setCurrentEmoji(null);
  }, [generateSequence, generateOptions]);

  // Показ последовательности
  useEffect(() => {
    if (status === 'showing') {
      if (state.showingIndex < state.sequence.length) {
        // Показываем текущий эмодзи
        setCurrentEmoji(state.sequence[state.showingIndex]);

        showingTimeoutRef.current = window.setTimeout(() => {
          // Прячем эмодзи (пауза)
          setCurrentEmoji(null);

          showingTimeoutRef.current = window.setTimeout(() => {
            // Переходим к следующему
            setState((prev) => ({
              ...prev,
              showingIndex: prev.showingIndex + 1,
            }));
          }, TIMINGS.SEQUENCE_PAUSE);
        }, TIMINGS.SEQUENCE_SHOW);
      } else {
        // Последовательность показана полностью
        setStatus('input');
        setState((prev) => ({
          ...prev,
          phase: 'input',
          showingIndex: 0,
        }));
      }
    }

    return () => {
      if (showingTimeoutRef.current) {
        clearTimeout(showingTimeoutRef.current);
      }
    };
  }, [status, state.showingIndex, state.sequence]);

  // Обработка выбора варианта
  const handleOptionClick = useCallback(
    (emoji: string) => {
      if (status !== 'input') return;

      const newUserSequence = [...state.userSequence, emoji];
      const currentIndex = newUserSequence.length - 1;

      // Проверяем правильность
      const isCorrect = emoji === state.sequence[currentIndex];

      if (!isCorrect) {
        // Ошибка - продолжаем с той же длиной
        setLastAnswerCorrect(false);
        setStatus('feedback');

        feedbackTimeoutRef.current = window.setTimeout(() => {
          // Проверяем, достигнут ли максимум
          if (state.currentLength >= MAX_LENGTH) {
            setStatus('results');
          } else {
            // Продолжаем с той же длиной
            const nextSequence = generateSequence(state.currentLength);
            const nextOptions = generateOptions(nextSequence);

            setState({
              sequence: nextSequence,
              userSequence: [],
              currentLength: state.currentLength,
              phase: 'showing',
              showingIndex: 0,
            });
            setOptions(nextOptions);
            setStatus('showing');
            setCurrentEmoji(null);
          }
        }, 1500);

        return;
      }

      // Правильный ответ
      setState((prev) => ({
        ...prev,
        userSequence: newUserSequence,
      }));

      // Проверяем, завершена ли последовательность
      if (newUserSequence.length === state.sequence.length) {
        // Последовательность воспроизведена правильно!
        const scoreForSequence = state.currentLength;
        setTotalScore((prev) => prev + scoreForSequence);
        setCorrectSequences((prev) => prev + 1);
        setLastAnswerCorrect(true);
        setStatus('feedback');

        feedbackTimeoutRef.current = window.setTimeout(() => {
          // Проверяем, достигнут ли максимум
          if (state.currentLength >= MAX_LENGTH) {
            setStatus('results');
          } else {
            // Переходим к следующей последовательности
            const nextLength = state.currentLength + 1;
            const nextSequence = generateSequence(nextLength);
            const nextOptions = generateOptions(nextSequence);

            setState({
              sequence: nextSequence,
              userSequence: [],
              currentLength: nextLength,
              phase: 'showing',
              showingIndex: 0,
            });
            setOptions(nextOptions);
            setStatus('showing');
            setCurrentEmoji(null);
          }
        }, 1500);
      }
    },
    [status, state, generateSequence, generateOptions]
  );

  // Очистка таймеров при размонтировании
  useEffect(() => {
    return () => {
      if (showingTimeoutRef.current) {
        clearTimeout(showingTimeoutRef.current);
      }
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  return {
    status,
    sequence: state.sequence,
    userSequence: state.userSequence,
    options,
    currentLength: state.currentLength,
    showingIndex: state.showingIndex,
    currentEmoji,
    totalScore,
    correctSequences,
    lastAnswerCorrect,
    startGame,
    handleOptionClick,
  };
}

