import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

/** A string-valued setting persisted in AsyncStorage, keyed by `storageKey`,
 * falling back to `defaultValue` until the stored value loads (or if it was
 * never set, or no longer matches `validValues`). */
export function usePersistedChoice<T extends string>(
  storageKey: string,
  validValues: readonly T[],
  defaultValue: T
): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    AsyncStorage.getItem(storageKey).then((stored) => {
      if (stored && (validValues as readonly string[]).includes(stored)) setValue(stored as T);
    });
  }, [storageKey]);

  function update(next: T) {
    setValue(next);
    AsyncStorage.setItem(storageKey, next).catch(() => {});
  }

  return [value, update];
}
