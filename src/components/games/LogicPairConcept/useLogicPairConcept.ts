import { useState, useCallback, useMemo } from 'react';
import { shuffleArray } from '../../../utils/randomUtils';

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

// Создаёт перемешанную версию раунда с обновлёнными индексами пар
function createShuffledRound(round: Round): { items: string[]; correctPairs: number[][] } {
  // Создаём массив индексов [0, 1, 2, 3]
  const indices = round.items.map((_, i) => i);
  
  // Перемешиваем индексы
  const shuffledIndices = shuffleArray([...indices]);
  
  // Создаём перемешанный массив items
  const shuffledItems = shuffledIndices.map(i => round.items[i]);
  
  // Создаём карту: старый индекс -> новый индекс
  const indexMap = new Map<number, number>();
  shuffledIndices.forEach((oldIndex, newIndex) => {
    indexMap.set(oldIndex, newIndex);
  });
  
  // Обновляем correctPairs с новыми индексами
  const shuffledPairs = round.correctPairs.map(pair => {
    return [indexMap.get(pair[0])!, indexMap.get(pair[1])!];
  });
  
  return {
    items: shuffledItems,
    correctPairs: shuffledPairs,
  };
}

interface GameState {
  currentRound: number;
  selectedItems: number[];
  correctAnswers: number;
  shuffledItems: string[];
  shuffledPairs: number[][];
}

export function useLogicPairConcept(): UseLogicPairConceptReturn {
  const [status, setStatus] = useState<GameStatus>('intro');
  const [state, setState] = useState<GameState>({
    currentRound: 0,
    selectedItems: [],
    correctAnswers: 0,
    shuffledItems: [],
    shuffledPairs: [],
  });
  const [score, setScore] = useState(0);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);

  // Инициализация раунда с перемешиванием
  const initializeRound = useCallback((roundIndex: number) => {
    const round = ROUNDS[roundIndex];
    const { items, correctPairs } = createShuffledRound(round);
    
    setState(prev => ({
      ...prev,
      currentRound: roundIndex,
      selectedItems: [],
      shuffledItems: items,
      shuffledPairs: correctPairs,
    }));
  }, []);

  // Начало игры
  const startGame = useCallback(() => {
    const round = ROUNDS[0];
    const { items, correctPairs } = createShuffledRound(round);
    
    setState({
      currentRound: 0,
      selectedItems: [],
      correctAnswers: 0,
      shuffledItems: items,
      shuffledPairs: correctPairs,
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
    const [first, second] = state.selectedItems.sort((a, b) => a - b);

    // Проверяем, есть ли такая пара в shuffledPairs
    return state.shuffledPairs.some(
      (pair) => {
        const [p1, p2] = pair.sort((a, b) => a - b);
        return p1 === first && p2 === second;
      }
    );
  }, [state.selectedItems, state.shuffledPairs]);

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
      // Следующий раунд с перемешиванием
      initializeRound(nextRound);
      setLastAnswerCorrect(null);
      setStatus('playing');
    }
  }, [state.currentRound, initializeRound]);

  return {
    status,
    currentRound: state.currentRound + 1, // Для отображения (1-based)
    items: state.shuffledItems.length > 0 ? state.shuffledItems : ROUNDS[0].items,
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
