import { useState, useEffect, useCallback } from 'react';

// Проверка доступности LocalStorage
function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Хук для работы с LocalStorage с автоматической сериализацией/десериализацией
 * 
 * @param key - ключ в LocalStorage
 * @param initialValue - начальное значение, если ключ не найден
 * @returns [value, setValue, remove] - текущее значение, функция установки, функция удаления
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Получение начального значения из LocalStorage
  const readValue = (): T => {
    if (typeof window === 'undefined' || !isLocalStorageAvailable()) {
      return initialValue;
    }

    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  };

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Функция для сохранения значения. Функциональный setState: несколько
  // вызовов подряд в одном тике применяются по очереди, а не затирают друг друга.
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue(prev => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        try {
          if (typeof window !== 'undefined' && isLocalStorageAvailable()) {
            localStorage.setItem(key, JSON.stringify(valueToStore));
          }
        } catch (error) {
          console.warn(`Error setting localStorage key "${key}":`, error);
        }
        return valueToStore;
      });
    },
    [key]
  );

  // Функция для удаления значения
  const remove = useCallback(() => {
    setStoredValue(initialValue);
    try {
      if (typeof window !== 'undefined' && isLocalStorageAvailable()) {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
    // initialValue is the value the hook was created with; callers pass literals
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Синхронизация с изменениями в других вкладках
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.warn(`Error parsing storage event for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue, remove];
}

export default useLocalStorage;

