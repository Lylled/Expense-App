import { createContext, useContext, type PropsWithChildren } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { usePersistedChoice } from '@/hooks/use-persisted-choice';

export type ThemePreference = 'light' | 'dark' | 'system';

const THEME_PREFERENCE_VALUES: readonly ThemePreference[] = ['light', 'dark', 'system'];
const STORAGE_KEY = 'theme-preference';

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  colorScheme: 'light' | 'dark';
  setPreference: (preference: ThemePreference) => void;
};

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

export function ThemePreferenceProvider({ children }: PropsWithChildren) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreference] = usePersistedChoice(STORAGE_KEY, THEME_PREFERENCE_VALUES, 'system');

  const colorScheme = preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  return (
    <ThemePreferenceContext.Provider value={{ preference, colorScheme, setPreference }}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference() {
  const context = useContext(ThemePreferenceContext);
  if (!context) throw new Error('useThemePreference must be used within a ThemePreferenceProvider');
  return context;
}
