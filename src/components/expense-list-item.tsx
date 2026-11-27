import type { ReactNode } from 'react';
import { View } from 'react-native';

import { expenseListStyles as styles } from '@/components/expense-list.styles';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { formatAmount, type ExpenseWithCategory } from '@/lib/expenses';

export type ExpenseListItemProps = {
  expense: ExpenseWithCategory;
  highlighted?: boolean;
  actions?: ReactNode;
};

export function ExpenseListItem({ expense, highlighted, actions }: ExpenseListItemProps) {
  const theme = useTheme();

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.expenseCard, highlighted && { backgroundColor: theme.backgroundSelected }]}>
      <View style={styles.expenseHeaderRow}>
        <ThemedText type="smallBold" style={styles.expenseHeaderName}>
          {expense.category?.name ?? '(luokka poistettu)'}
        </ThemedText>
        {actions}
      </View>
      <View style={styles.expenseRow}>
        <View>
          <ThemedText type="small" themeColor="textSecondary">
            {expense.description || '—'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {expense.expense_date}
          </ThemedText>
        </View>
        <ThemedText type="smallBold">{formatAmount(expense.amount)}</ThemedText>
      </View>
    </ThemedView>
  );
}
