import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseTimerOptions {
  /**
   * Интервал обновления таймера в миллисекундах
   * @default 100
   */
  interval?: number;
  
  /**
   * Автоматический старт таймера
   * @default false
   */
  autoStart?: boolean;
}

export interface UseTimerReturn {
  /** Текущее время в миллисекундах */
  time: number;
  /** Таймер запущен */
  isRunning: boolean;
  /** Запустить таймер */
  start: () => void;
  /** Остановить таймер */
  stop: () => void;
  /** Сбросить таймер */
  reset: () => void;
  /** Перезапустить таймер (сброс + старт) */
  restart: () => void;
}

/**
 * Хук для работы с таймером
 * 
 * @param options - опции таймера
 * @returns объект с состоянием и методами управления таймером
 */
export function useTimer(options: UseTimerOptions = {}): UseTimerReturn {
  const { interval = 100, autoStart = false } = options;
  
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(autoStart);
  
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  const start = useCallback(() => {
    if (!isRunning) {
      startTimeRef.current = Date.now() - pausedTimeRef.current;
      setIsRunning(true);
    }
  }, [isRunning]);

  const stop = useCallback(() => {
    if (isRunning) {
      pausedTimeRef.current = Date.now() - startTimeRef.current;
      setIsRunning(false);
    }
  }, [isRunning]);

  const reset = useCallback(() => {
    setTime(0);
    pausedTimeRef.current = 0;
    startTimeRef.current = Date.now();
  }, []);

  const restart = useCallback(() => {
    reset();
    setIsRunning(true);
  }, [reset]);

  useEffect(() => {
    if (isRunning) {
      intervalIdRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setTime(elapsed);
      }, interval);
    } else {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    }

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [isRunning, interval]);

  return {
    time,
    isRunning,
    start,
    stop,
    reset,
    restart,
  };
}

export default useTimer;

