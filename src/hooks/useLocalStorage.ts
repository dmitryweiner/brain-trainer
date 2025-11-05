import { useState, useEffect } from 'react';

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
  // Проверка доступности LocalStorage
  const isLocalStorageAvailable = (): boolean => {
    try {
      const testKey = '__test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  };

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

  // Функция для сохранения значения
  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      setStoredValue(valueToStore);

      if (typeof window !== 'undefined' && isLocalStorageAvailable()) {
        localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  // Функция для удаления значения
  const remove = () => {
    try {
      setStoredValue(initialValue);
      
      if (typeof window !== 'undefined' && isLocalStorageAvailable()) {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  };

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

