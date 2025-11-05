import { useState, useCallback } from 'react';
import type { LogicPairConceptState } from '../../../types/game.types';

type GameStatus = 'intro' | 'playing' | 'feedback' | 'results';

interface Round {
  items: string[];
  correctPairs: number[][];
  category: string;
}

interface UseLogicPairConceptReturn {
  status: GameStatus;
  currentRound: number;
  items: string[];
  selectedItems: number[];
  correctAnswers: number;
  score: number;
  lastAnswerCorrect: boolean | null;
  canSubmit: boolean;
  startGame: () => void;
  handleItemClick: (index: number) => void;
  handleSubmit: () => void;
  handleContinue: () => void;
}

const ROUNDS: Round[] = [
  {
    items: ['🍎 Яблоко', '🍊 Апельсин', '🐕 Собака', '🍌 Банан'],
    correctPairs: [[0, 1], [0, 3], [1, 3]], // любые 2 фрукта
    category: 'фрукты'
  },
  {
    items: ['⚽️ Футбол', '🏀 Баскетбол', '📚 Книга', '🎹 Пианино'],
    correctPairs: [[0, 1]],
    category: 'спорт'
  },
  {
    items: ['🐕 Собака', '🐈 Кошка', '🚗 Машина', '🌳 Дерево'],
    correctPairs: [[0, 1]],
    category: 'животные'
  },
  {
    items: ['☀️ Солнце', '🌙 Луна', '🍕 Пицца', '⭐ Звезда'],
    correctPairs: [[0, 1], [0, 3], [1, 3]],
    category: 'небесные тела'
  },
  {
    items: ['👔 Рубашка', '👖 Брюки', '🍞 Хлеб', '🥐 Круассан'],
    correctPairs: [[0, 1], [2, 3]],
    category: 'одежда или еда'
  },
  {
    items: ['🎸 Гитара', '🎹 Пианино', '✏️ Карандаш', '🖊️ Ручка'],
    correctPairs: [[0, 1], [2, 3]],
    category: 'инструменты музыкальные или письменные'
  },
  {
    items: ['🌹 Роза', '🌻 Подсолнух', '🦅 Орёл', '🦋 Бабочка'],
    correctPairs: [[0, 1], [2, 3]],
    category: 'растения или живые существа'
  },
  {
    items: ['🏠 Дом', '🏢 Здание', '🍔 Бургер', '🌮 Тако'],
    correctPairs: [[0, 1], [2, 3]],
    category: 'строения или еда'
  },
  {
    items: ['📱 Телефон', '💻 Ноутбук', '👞 Ботинки', '👟 Кроссовки'],
    correctPairs: [[0, 1], [2, 3]],
    category: 'техника или обувь'
  },
  {
    items: ['🌊 Море', '🏔️ Гора', '🌋 Вулкан', '🏝️ Остров'],
    correctPairs: [[0, 3], [1, 2]],
    category: 'природные объекты'
  },
];

const TOTAL_ROUNDS = ROUNDS.length;

export function useLogicPairConcept(): UseLogicPairConceptReturn {
  const [status, setStatus] = useState<GameStatus>('intro');
  const [state, setState] = useState<LogicPairConceptState>({
    currentRound: 0,
    selectedItems: [],
    correctAnswers: 0,
  });
  const [score, setScore] = useState(0);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);

  // Начало игры
  const startGame = useCallback(() => {
    setState({
      currentRound: 0,
      selectedItems: [],
      correctAnswers: 0,
    });
    setScore(0);
    setLastAnswerCorrect(null);
    setStatus('playing');
  }, []);

  // Обработка клика на элемент
  const handleItemClick = useCallback((index: number) => {
    if (status !== 'playing') return;

    setState((prev) => {
      const isSelected = prev.selectedItems.includes(index);
      
      if (isSelected) {
        // Отмена выбора
        return {
          ...prev,
          selectedItems: prev.selectedItems.filter((i) => i !== index),
        };
      } else {
        // Добавление выбора (максимум 2)
        if (prev.selectedItems.length < 2) {
          return {
            ...prev,
            selectedItems: [...prev.selectedItems, index],
          };
        }
        return prev;
      }
    });
  }, [status]);

  // Проверка правильности выбора
  const checkAnswer = useCallback((): boolean => {
    const currentRoundData = ROUNDS[state.currentRound];
    const [first, second] = state.selectedItems.sort((a, b) => a - b);

    // Проверяем, есть ли такая пара в correctPairs
    return currentRoundData.correctPairs.some(
      (pair) => 
        (pair[0] === first && pair[1] === second) ||
        (pair[1] === first && pair[0] === second)
    );
  }, [state.currentRound, state.selectedItems]);

  // Подтверждение ответа
  const handleSubmit = useCallback(() => {
    if (status !== 'playing' || state.selectedItems.length !== 2) return;

    const isCorrect = checkAnswer();

    setLastAnswerCorrect(isCorrect);
    
    if (isCorrect) {
      setState((prev) => ({
        ...prev,
        correctAnswers: prev.correctAnswers + 1,
      }));
      setScore((prev) => prev + 2);
    }

    setStatus('feedback');
  }, [status, state.selectedItems, checkAnswer]);

  // Переход к следующему раунду или завершение игры
  const handleContinue = useCallback(() => {
    const nextRound = state.currentRound + 1;

    if (nextRound >= TOTAL_ROUNDS) {
      // Игра завершена
      setStatus('results');
    } else {
      // Следующий раунд
      setState((prev) => ({
        ...prev,
        currentRound: nextRound,
        selectedItems: [],
      }));
      setLastAnswerCorrect(null);
      setStatus('playing');
    }
  }, [state.currentRound]);

  const currentRoundData = ROUNDS[state.currentRound] || ROUNDS[0];

  return {
    status,
    currentRound: state.currentRound + 1, // Для отображения (1-based)
    items: currentRoundData.items,
    selectedItems: state.selectedItems,
    correctAnswers: state.correctAnswers,
    score,
    lastAnswerCorrect,
    canSubmit: state.selectedItems.length === 2,
    startGame,
    handleItemClick,
    handleSubmit,
    handleContinue,
  };
}

