import { useState, useCallback, useRef } from 'react';
import type { DualRuleState } from '../../../types/game.types';
import { getRandomInt } from '../../../utils/randomUtils';

type GameStatus = 'intro' | 'playing' | 'feedback' | 'results';
type Shape = 'circle' | 'square';
type Color = 'green' | 'red';
type Answer = 'A' | 'B';

interface UseDualRuleReactionReturn {
  status: GameStatus;
  currentRound: number;
  shape: Shape;
  color: Color;
  currentRule: 'shape' | 'color';
  errors: number;
  score: number;
  reactionTimes: number[];
  lastAnswerCorrect: boolean | null;
  showRuleHint: boolean;
  startGame: () => void;
  handleAnswer: (answer: Answer) => void;
  proceedToNextRound: () => void;
}

const TOTAL_ROUNDS = 30;
const RULE_SWITCH_ROUND = 16;

export function useDualRuleReaction(): UseDualRuleReactionReturn {
  const [status, setStatus] = useState<GameStatus>('intro');
  const [state, setState] = useState<DualRuleState>({
    currentRound: 1,
    shape: 'circle',
    color: 'green',
    currentRule: 'shape',
    errors: 0,
    startTime: Date.now(),
  });
  const [score, setScore] = useState(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  
  const roundStartTimeRef = useRef<number>(Date.now());

  // Генерация случайной фигуры и цвета
  const generateStimulus = useCallback((): { shape: Shape; color: Color } => {
    const shapes: Shape[] = ['circle', 'square'];
    const colors: Color[] = ['green', 'red'];
    
    return {
      shape: shapes[getRandomInt(0, 1)],
      color: colors[getRandomInt(0, 1)],
    };
  }, []);

  // Начало игры
  const startGame = useCallback(() => {
    const { shape, color } = generateStimulus();
    
    setState({
      currentRound: 1,
      shape,
      color,
      currentRule: 'shape',
      errors: 0,
      startTime: Date.now(),
    });
    setScore(0);
    setReactionTimes([]);
    setLastAnswerCorrect(null);
    setStatus('playing');
    roundStartTimeRef.current = Date.now();
  }, [generateStimulus]);

  // Проверка правильности ответа
  const checkAnswer = useCallback((answer: Answer): boolean => {
    const { shape, color, currentRule } = state;

    if (currentRule === 'shape') {
      // Правило по форме: круг → A, квадрат → B
      return (shape === 'circle' && answer === 'A') || (shape === 'square' && answer === 'B');
    } else {
      // Правило по цвету: зелёный → A, красный → B
      return (color === 'green' && answer === 'A') || (color === 'red' && answer === 'B');
    }
  }, [state]);

  // Обработка ответа
  const handleAnswer = useCallback(
    (answer: Answer) => {
      if (status !== 'playing') return;

      const reactionTime = Date.now() - roundStartTimeRef.current;
      const isCorrect = checkAnswer(answer);

      // Обновляем очки
      if (isCorrect) {
        setScore((prev) => prev + 1);
      } else {
        setScore((prev) => Math.max(0, prev - 0.5));
        setState((prev) => ({
          ...prev,
          errors: prev.errors + 1,
        }));
      }

      // Сохраняем время реакции
      setReactionTimes((prev) => [...prev, reactionTime]);
      setLastAnswerCorrect(isCorrect);
      setStatus('feedback');
    },
    [status, checkAnswer]
  );

  // Переход к следующему раунду
  const proceedToNextRound = useCallback(() => {
    if (state.currentRound >= TOTAL_ROUNDS) {
      // Игра завершена
      setStatus('results');
      return;
    }

    const nextRound = state.currentRound + 1;
    const { shape, color } = generateStimulus();

    // Определяем текущее правило
    const currentRule = nextRound < RULE_SWITCH_ROUND ? 'shape' : 'color';

    setState((prev) => ({
      ...prev,
      currentRound: nextRound,
      shape,
      color,
      currentRule,
    }));

    setLastAnswerCorrect(null);
    setStatus('playing');
    roundStartTimeRef.current = Date.now();
  }, [state.currentRound, generateStimulus]);

  // Показывать подсказку о правиле только в первом раунде
  const showRuleHint = state.currentRound === 1;

  return {
    status,
    currentRound: state.currentRound,
    shape: state.shape,
    color: state.color,
    currentRule: state.currentRule,
    errors: state.errors,
    score,
    reactionTimes,
    lastAnswerCorrect,
    showRuleHint,
    startGame,
    handleAnswer,
    proceedToNextRound,
  };
}

