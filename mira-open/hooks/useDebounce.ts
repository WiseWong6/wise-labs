import { useState, useEffect, useCallback } from 'react';

export function useDebounce<T>(value: T, delay: number): [T, (v: T) => void] {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  const flush = useCallback((v: T) => setDebouncedValue(v), []);

  return [debouncedValue, flush];
}
