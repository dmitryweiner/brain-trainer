import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimer } from './useTimer';

describe('useTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with time 0 and not running', () => {
    const { result } = renderHook(() => useTimer());
    
    expect(result.current.time).toBe(0);
    expect(result.current.isRunning).toBe(false);
  });

  it('should start timer', () => {
    const { result } = renderHook(() => useTimer());
    
    act(() => {
      result.current.start();
    });
    
    expect(result.current.isRunning).toBe(true);
  });

  it('should stop timer', () => {
    const { result } = renderHook(() => useTimer());
    
    act(() => {
      result.current.start();
    });
    
    expect(result.current.isRunning).toBe(true);
    
    act(() => {
      result.current.stop();
    });
    
    expect(result.current.isRunning).toBe(false);
  });

  it('should increment time when running', () => {
    const { result } = renderHook(() => useTimer({ interval: 100 }));
    
    expect(result.current.time).toBe(0);
    
    act(() => {
      result.current.start();
    });
    
    expect(result.current.isRunning).toBe(true);
  });

  it('should reset timer to 0', () => {
    const { result } = renderHook(() => useTimer());
    
    act(() => {
      result.current.start();
    });
    
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    act(() => {
      result.current.reset();
    });
    
    expect(result.current.time).toBe(0);
  });

  it('should restart timer (reset and start)', async () => {
    const { result } = renderHook(() => useTimer());
    
    act(() => {
      result.current.start();
    });
    
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    act(() => {
      result.current.stop();
    });
    
    act(() => {
      result.current.restart();
    });
    
    expect(result.current.time).toBe(0);
    expect(result.current.isRunning).toBe(true);
  });

  it('should not increment time when stopped', () => {
    const { result } = renderHook(() => useTimer());
    
    act(() => {
      result.current.start();
    });
    
    act(() => {
      vi.advanceTimersByTime(500);
    });
    
    act(() => {
      result.current.stop();
    });
    
    const stoppedTime = result.current.time;
    
    act(() => {
      vi.advanceTimersByTime(500);
    });
    
    // Time should remain the same after stopping
    expect(result.current.time).toBe(stoppedTime);
  });

  it('should auto-start when autoStart is true', () => {
    const { result } = renderHook(() => useTimer({ autoStart: true }));
    
    expect(result.current.isRunning).toBe(true);
  });

  it('should use custom interval', () => {
    const { result } = renderHook(() => useTimer({ interval: 50 }));
    
    expect(result.current.time).toBe(0);
    expect(result.current.isRunning).toBe(false);
    
    act(() => {
      result.current.start();
    });
    
    expect(result.current.isRunning).toBe(true);
  });

  it('should resume from paused time', () => {
    const { result } = renderHook(() => useTimer());
    
    act(() => {
      result.current.start();
    });
    
    expect(result.current.isRunning).toBe(true);
    
    act(() => {
      result.current.stop();
    });
    
    expect(result.current.isRunning).toBe(false);
    
    act(() => {
      result.current.start();
    });
    
    // Should be running again
    expect(result.current.isRunning).toBe(true);
  });

  it('should cleanup interval on unmount', () => {
    const { result, unmount } = renderHook(() => useTimer());
    
    act(() => {
      result.current.start();
    });
    
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    
    unmount();
    
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('should not start if already running', () => {
    const { result } = renderHook(() => useTimer());
    
    act(() => {
      result.current.start();
    });
    
    const setIntervalSpy = vi.spyOn(global, 'setInterval');
    const callCount = setIntervalSpy.mock.calls.length;
    
    act(() => {
      result.current.start();
    });
    
    // setInterval should not be called again
    expect(setIntervalSpy.mock.calls.length).toBe(callCount);
  });

  it('should not stop if not running', () => {
    const { result } = renderHook(() => useTimer());
    
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    
    act(() => {
      result.current.stop();
    });
    
    expect(clearIntervalSpy).not.toHaveBeenCalled();
  });

  it('should handle multiple start/stop cycles', () => {
    const { result } = renderHook(() => useTimer());
    
    // First cycle
    act(() => {
      result.current.start();
    });
    
    expect(result.current.isRunning).toBe(true);
    
    act(() => {
      result.current.stop();
    });
    
    expect(result.current.isRunning).toBe(false);
    
    // Second cycle
    act(() => {
      result.current.start();
    });
    
    expect(result.current.isRunning).toBe(true);
  });
});

