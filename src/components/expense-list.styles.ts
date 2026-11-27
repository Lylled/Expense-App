import { StyleSheet } from 'react-native';

import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

// Shared between the Menot tab and the category-expenses screen.
export const expenseListStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.three,
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  title: {
    textAlign: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  listContent: {
    gap: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  expenseCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  expenseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expenseHeaderName: {
    flexShrink: 1,
  },
});
