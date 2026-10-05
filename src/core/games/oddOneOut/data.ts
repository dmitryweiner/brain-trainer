// Для Odd One Out - категории по сложности (более похожие)
// Теперь с поддержкой разных размеров сетки
export type OddOneOutDifficulty = 'easy' | 'medium' | 'hard';

export interface OddOneOutLevel {
  gridSize: number;
  sets: readonly { main: string; odd: string; count: number }[];
}

export const ODD_ONE_OUT_EMOJIS: Record<OddOneOutDifficulty, OddOneOutLevel> = {
  easy: {
    // 3x3 сетка (9 элементов): разные категории, легко различимые
    gridSize: 3,
    sets: [
      { main: '😀', odd: '😊', count: 8 },
      { main: '🍎', odd: '🍊', count: 8 },
      { main: '🚗', odd: '🚕', count: 8 },
      { main: '🌸', odd: '🌺', count: 8 },
      { main: '⚽', odd: '🏀', count: 8 },
      { main: '❤️', odd: '💙', count: 8 },
      { main: '🐶', odd: '🐱', count: 8 },
      { main: '🌲', odd: '🌴', count: 8 },
    ],
  },
  medium: {
    // 4x4 сетка (16 элементов): похожие эмодзи
    gridSize: 4,
    sets: [
      { main: '😀', odd: '😃', count: 15 },
      { main: '😊', odd: '😄', count: 15 },
      { main: '🔴', odd: '🟠', count: 15 },
      { main: '⭐', odd: '🌟', count: 15 },
      { main: '🌕', odd: '🌖', count: 15 },
      { main: '👍', odd: '👎', count: 15 },
      { main: '💛', odd: '💚', count: 15 },
      { main: '🟡', odd: '🟢', count: 15 },
    ],
  },
  hard: {
    // 5x5 сетка (25 элементов): МАКСИМАЛЬНО похожие
    gridSize: 5,
    sets: [
      { main: '😀', odd: '😁', count: 24 },
      { main: '🌕', odd: '🌖', count: 24 },
      { main: '🌗', odd: '🌘', count: 24 },
      { main: '😄', odd: '😃', count: 24 },
      { main: '💛', odd: '🧡', count: 24 },
      { main: '🟡', odd: '🟠', count: 24 },
      { main: '😊', odd: '🙂', count: 24 },
      { main: '🌑', odd: '🌚', count: 24 },
      { main: '❤️', odd: '🧡', count: 24 },
      { main: '🔵', odd: '🟦', count: 24 },
    ],
  },
};
