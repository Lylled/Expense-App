import { StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';

// Shared between category-action-menu.tsx and category-action-menu.android.tsx.
export const categoryActionMenuStyles = StyleSheet.create({
  menuButton: {
    paddingHorizontal: Spacing.two,
  },
  menuDots: {
    fontSize: 20,
  },
});
