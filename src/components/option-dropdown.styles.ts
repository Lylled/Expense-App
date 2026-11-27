import { StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';

// Shared between option-dropdown.tsx and option-dropdown.android.tsx.
export const optionDropdownStyles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: '#ffffff',
  },
  triggerText: {
    color: '#000000',
  },
  chevron: {
    color: '#8A8A8E',
  },
});
