import { useState, useCallback, useEffect, useRef } from 'react';

type GameStatus = 'intro' | 'memorize' | 'input' | 'feedback' | 'results';

interface PhoneRecallState {
  number: string;
  userInput: string;
  currentLength: number;
}

interface UsePhoneRecallReturn {
  status: GameStatus;
  number: string;
  userInput: string;
  currentLength: number;
  totalScore: number;
  correctNumbers: number;
  lastAnswerCorrect: boolean;
  memorizeTimeLeft: number;
  startGame: () => void;
  handleDigitClick: (digit: string) => void;
  handleBackspace: () => void;
  handleSubmit: () => void;
}

const INITIAL_LENGTH = 4;
const MAX_LENGTH = 6;
const MEMORIZE_TIME_BASE = 2000; // базовое время
const MEMORIZE_TIME_PER_DIGIT = 500; // доп. время за каждую цифру

export function usePhoneRecall(): UsePhoneRecallReturn {
  const [status, setStatus] = useState<GameStatus>('intro');
  const [state, setState] = useState<PhoneRecallState>({
    number: '',
    userInput: '',
    currentLength: INITIAL_LENGTH,
  });
  const [totalScore, setTotalScore] = useState(0);
  const [correctNumbers, setCorrectNumbers] = useState(0);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(true);
  const [memorizeTimeLeft, setMemorizeTimeLeft] = useState(0);

  const memorizeTimerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const autoCheckRef = useRef<boolean>(false);

  // Генерация случайного числа заданной длины
  const generateNumber = useCallback((length: number): string => {
    let result = '';
    // Первая цифра не должна быть 0
    result += Math.floor(Math.random() * 9) + 1;
    for (let i = 1; i < length; i++) {
      result += Math.floor(Math.random() * 10);
    }
    return result;
  }, []);

  // Подсчёт времени на запоминание
  const getMemorizeTime = useCallback((length: number): number => {
    return MEMORIZE_TIME_BASE + length * MEMORIZE_TIME_PER_DIGIT;
  }, []);

  // Начало игры
  const startGame = useCallback(() => {
    const number = generateNumber(INITIAL_LENGTH);
    const memorizeTime = getMemorizeTime(INITIAL_LENGTH);

    setState({
      number,
      userInput: '',
      currentLength: INITIAL_LENGTH,
    });
    setStatus('memorize');
    setTotalScore(0);
    setCorrectNumbers(0);
    setLastAnswerCorrect(true);
    setMemorizeTimeLeft(Math.ceil(memorizeTime / 1000));
    autoCheckRef.current = false;

    // Обратный отсчёт
    countdownRef.current = window.setInterval(() => {
      setMemorizeTimeLeft((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Таймер на переход к вводу
    memorizeTimerRef.current = window.setTimeout(() => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      setStatus('input');
    }, memorizeTime);
  }, [generateNumber, getMemorizeTime]);

  // Логика проверки ответа (вынесена для использования в handleDigitClick и handleSubmit)
  const checkAnswer = useCallback((userInput: string, number: string, currentLength: number) => {
    const isCorrect = userInput === number;

    if (!isCorrect) {
      // Ошибка - продолжаем с той же длиной
      setLastAnswerCorrect(false);
      setStatus('feedback');

      feedbackTimeoutRef.current = window.setTimeout(() => {
        // Проверяем, достигнут ли максимум
        if (currentLength >= MAX_LENGTH) {
          setStatus('results');
        } else {
          // Продолжаем с той же длиной
          const nextNumber = generateNumber(currentLength);
          const memorizeTime = getMemorizeTime(currentLength);

          setState({
            number: nextNumber,
            userInput: '',
            currentLength: currentLength,
          });
          setStatus('memorize');
          setMemorizeTimeLeft(Math.ceil(memorizeTime / 1000));

          // Обратный отсчёт
          countdownRef.current = window.setInterval(() => {
            setMemorizeTimeLeft((prev) => {
              if (prev <= 1) {
                if (countdownRef.current) clearInterval(countdownRef.current);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);

          memorizeTimerRef.current = window.setTimeout(() => {
            if (countdownRef.current) clearInterval(countdownRef.current);
            setStatus('input');
          }, memorizeTime);
        }
      }, 1500);
      return;
    }

    // Правильный ответ
    const scoreForNumber = currentLength;
    setTotalScore((prev) => prev + scoreForNumber);
    setCorrectNumbers((prev) => prev + 1);
    setLastAnswerCorrect(true);
    setStatus('feedback');

    feedbackTimeoutRef.current = window.setTimeout(() => {
      // Проверяем, достигнут ли максимум
      if (currentLength >= MAX_LENGTH) {
        setStatus('results');
      } else {
        // Переходим к следующему числу
        const nextLength = currentLength + 1;
        const nextNumber = generateNumber(nextLength);
        const memorizeTime = getMemorizeTime(nextLength);

        setState({
          number: nextNumber,
          userInput: '',
          currentLength: nextLength,
        });
        setStatus('memorize');
        setMemorizeTimeLeft(Math.ceil(memorizeTime / 1000));

        // Обратный отсчёт
        countdownRef.current = window.setInterval(() => {
          setMemorizeTimeLeft((prev) => {
            if (prev <= 1) {
              if (countdownRef.current) clearInterval(countdownRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        memorizeTimerRef.current = window.setTimeout(() => {
          if (countdownRef.current) clearInterval(countdownRef.current);
          setStatus('input');
        }, memorizeTime);
      }
    }, 1500);
  }, [generateNumber, getMemorizeTime]);

  // Ввод цифры с автопроверкой
  const handleDigitClick = useCallback((digit: string) => {
    if (status !== 'input') return;
    
    setState((prev) => {
      if (prev.userInput.length >= prev.currentLength) return prev;
      
      const newInput = prev.userInput + digit;
      
      // Если ввели все цифры, автоматически проверяем
      if (newInput.length === prev.currentLength) {
        // Используем setTimeout чтобы состояние успело обновиться
        setTimeout(() => {
          checkAnswer(newInput, prev.number, prev.currentLength);
        }, 0);
      }
      
      return {
        ...prev,
        userInput: newInput,
      };
    });
  }, [status, checkAnswer]);

  // Удаление последней цифры
  const handleBackspace = useCallback(() => {
    if (status !== 'input') return;
    
    setState((prev) => ({
      ...prev,
      userInput: prev.userInput.slice(0, -1),
    }));
  }, [status]);

  // Отправка ответа (оставлена для совместимости, но автопроверка происходит в handleDigitClick)
  const handleSubmit = useCallback(() => {
    if (status !== 'input') return;
    if (state.userInput.length !== state.currentLength) return;

    checkAnswer(state.userInput, state.number, state.currentLength);
  }, [status, state, checkAnswer]);

  // Очистка таймеров при размонтировании
  useEffect(() => {
    return () => {
      if (memorizeTimerRef.current) clearTimeout(memorizeTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  return {
    status,
    number: state.number,
    userInput: state.userInput,
    currentLength: state.currentLength,
    totalScore,
    correctNumbers,
    lastAnswerCorrect,
    memorizeTimeLeft,
    startGame,
    handleDigitClick,
    handleBackspace,
    handleSubmit,
  };
}
