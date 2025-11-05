/**
 * Генерирует случайное целое число в диапазоне [min, max] включительно
 */
export function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Перемешивает массив (не изменяя оригинальный)
 * Использует алгоритм Fisher-Yates
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Выбирает случайный элемент из массива
 */
export function getRandomElement<T>(array: T[]): T {
  return array[getRandomInt(0, array.length - 1)];
}

/**
 * Выбирает N случайных уникальных элементов из массива
 */
export function getRandomElements<T>(array: T[], count: number): T[] {
  if (count >= array.length) {
    return shuffleArray(array);
  }
  
  const shuffled = shuffleArray(array);
  return shuffled.slice(0, count);
}

