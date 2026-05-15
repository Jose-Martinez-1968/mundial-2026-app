import { useState } from 'react';

type InitialValue<T> = T | (() => T);

const resolveInitialValue = <T,>(initialValue: InitialValue<T>): T => {
  return initialValue instanceof Function ? initialValue() : initialValue;
};

export function useLocalStorage<T>(key: string, initialValue: InitialValue<T>) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return resolveInitialValue(initialValue);
    }

    try {
      const item = window.localStorage.getItem(key);

      if (!item) {
        return resolveInitialValue(initialValue);
      }

      const reviver = (_key: string, value: unknown) => {
        const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
        if (typeof value === 'string' && isoDateRegex.test(value)) {
          return new Date(value);
        }
        return value;
      };

      return JSON.parse(item, reviver) as T;
    } catch (error) {
      console.warn(`Error leyendo localStorage key "${key}":`, error);
      return resolveInitialValue(initialValue);
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    setStoredValue(previousValue => {
      try {
        const valueToStore = value instanceof Function ? value(previousValue) : value;

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }

        return valueToStore;
      } catch (error) {
        console.error(`Error guardando en localStorage key "${key}":`, error);
        return previousValue;
      }
    });
  };

  return [storedValue, setValue] as const;
}
