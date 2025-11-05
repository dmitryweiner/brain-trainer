import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should return initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    
    expect(result.current[0]).toBe('initial');
  });

  it('should return stored value from localStorage', () => {
    localStorage.setItem('test-key', JSON.stringify('stored'));
    
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    
    expect(result.current[0]).toBe('stored');
  });

  it('should update localStorage when value is set', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    
    act(() => {
      result.current[1]('updated');
    });
    
    expect(result.current[0]).toBe('updated');
    expect(localStorage.getItem('test-key')).toBe(JSON.stringify('updated'));
  });

  it('should work with objects', () => {
    const initialObj = { count: 0, name: 'test' };
    const { result } = renderHook(() => useLocalStorage('test-obj', initialObj));
    
    expect(result.current[0]).toEqual(initialObj);
    
    const updatedObj = { count: 5, name: 'updated' };
    act(() => {
      result.current[1](updatedObj);
    });
    
    expect(result.current[0]).toEqual(updatedObj);
    expect(JSON.parse(localStorage.getItem('test-obj')!)).toEqual(updatedObj);
  });

  it('should work with numbers', () => {
    const { result } = renderHook(() => useLocalStorage('test-number', 0));
    
    act(() => {
      result.current[1](42);
    });
    
    expect(result.current[0]).toBe(42);
    expect(localStorage.getItem('test-number')).toBe('42');
  });

  it('should work with arrays', () => {
    const { result } = renderHook(() => useLocalStorage('test-array', [1, 2, 3]));
    
    act(() => {
      result.current[1]([4, 5, 6]);
    });
    
    expect(result.current[0]).toEqual([4, 5, 6]);
  });

  it('should support functional updates', () => {
    const { result } = renderHook(() => useLocalStorage('test-count', 0));
    
    act(() => {
      result.current[1](prev => prev + 1);
    });
    
    expect(result.current[0]).toBe(1);
    
    act(() => {
      result.current[1](prev => prev + 5);
    });
    
    expect(result.current[0]).toBe(6);
  });

  it('should remove value from localStorage', () => {
    localStorage.setItem('test-key', JSON.stringify('stored'));
    
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    
    expect(result.current[0]).toBe('stored');
    
    act(() => {
      result.current[2](); // remove
    });
    
    expect(result.current[0]).toBe('initial');
    expect(localStorage.getItem('test-key')).toBeNull();
  });

  it('should handle invalid JSON in localStorage', () => {
    localStorage.setItem('test-key', 'invalid-json{');
    
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    
    expect(result.current[0]).toBe('initial');
    expect(consoleWarnSpy).toHaveBeenCalled();
    
    consoleWarnSpy.mockRestore();
  });

  it('should handle localStorage not available', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('LocalStorage not available');
    });
    
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    
    act(() => {
      result.current[1]('new-value');
    });
    
    expect(result.current[0]).toBe('new-value');
    
    setItemSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('should persist value across re-renders', () => {
    const { result, rerender } = renderHook(() => useLocalStorage('test-key', 'initial'));
    
    act(() => {
      result.current[1]('updated');
    });
    
    rerender();
    
    expect(result.current[0]).toBe('updated');
  });

  it('should handle boolean values', () => {
    const { result } = renderHook(() => useLocalStorage('test-bool', false));
    
    act(() => {
      result.current[1](true);
    });
    
    expect(result.current[0]).toBe(true);
    const stored = localStorage.getItem('test-bool');
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toBe(true);
  });

  it('should handle null values', () => {
    const { result } = renderHook(() => useLocalStorage<string | null>('test-null', null));
    
    act(() => {
      result.current[1]('value');
    });
    
    expect(result.current[0]).toBe('value');
    
    act(() => {
      result.current[1](null);
    });
    
    expect(result.current[0]).toBe(null);
  });

  it('should work with different keys independently', () => {
    const { result: result1 } = renderHook(() => useLocalStorage('key1', 'value1'));
    const { result: result2 } = renderHook(() => useLocalStorage('key2', 'value2'));
    
    act(() => {
      result1.current[1]('updated1');
    });
    
    expect(result1.current[0]).toBe('updated1');
    expect(result2.current[0]).toBe('value2');
  });
});

