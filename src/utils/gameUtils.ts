/**
 * Подсчёт очков для Reaction Click
 */
export function calculateReactionScore(reactionTime: number): number {
  if (reactionTime < 300) return 5;
  if (reactionTime < 500) return 3;
  if (reactionTime < 800) return 2;
  return 1;
}

/**
 * Подсчёт общих очков для массива времён реакции
 */
export function calculateTotalReactionScore(times: number[]): number {
  return times.reduce((total, time) => total + calculateReactionScore(time), 0);
}

/**
 * Подсчёт среднего времени
 */
export function calculateAverageTime(times: number[]): number {
  if (times.length === 0) return 0;
  const sum = times.reduce((acc, time) => acc + time, 0);
  return Math.round(sum / times.length);
}

/**
 * Подсчёт очков для Color Tap
 */
export function calculateColorTapScore(
  correctAnswers: number,
  fastAnswers: number
): number {
  return correctAnswers + fastAnswers * 0.5;
}

/**
 * Подсчёт очков для Hidden Number
 */
export function calculateHiddenNumberScore(time: number): number {
  if (time < 3000) return 3;
  if (time < 5000) return 2;
  return 1;
}

/**
 * Подсчёт очков для Memory Flip
 */
export function calculateMemoryFlipScore(level: 1 | 2, moves: number): number {
  if (level === 1) {
    const baseScore = 10;
    const optimalMoves = 5;
    return Math.max(0, baseScore - Math.max(0, moves - optimalMoves));
  } else {
    const baseScore = 20;
    const optimalMoves = 10;
    return Math.max(0, baseScore - Math.max(0, moves - optimalMoves));
  }
}

/**
 * Проверка корректности пары в Logic Pair Concept
 */
export function isCorrectPair(
  selected: number[],
  correctPairs: number[][]
): boolean {
  if (selected.length !== 2) return false;
  
  const [a, b] = selected.sort((x, y) => x - y);
  
  return correctPairs.some(pair => {
    const [x, y] = pair.sort((p1, p2) => p1 - p2);
    return a === x && b === y;
  });
}

/**
 * Форматирование времени в секундах
 */
export function formatTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const ms = milliseconds % 1000;
  
  if (seconds === 0) {
    return `${ms}ms`;
  }
  
  return `${seconds}.${Math.floor(ms / 100)}s`;
}

/**
 * Подсчёт процента правильных ответов
 */
export function calculateAccuracy(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}

