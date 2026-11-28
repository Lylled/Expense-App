import { Colors } from '@/constants/theme';
import { useThemePreference } from '@/hooks/use-theme-preference';

export function useTheme() {
  const { colorScheme } = useThemePreference();
  return Colors[colorScheme];
}
