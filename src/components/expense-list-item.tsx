import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { expenseListStyles as styles } from '@/components/expense-list.styles';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatAmount, type ExpenseWithCategory } from '@/lib/expenses';

export type ExpenseListItemProps = {
  expense: ExpenseWithCategory;
  highlighted?: boolean;
  actions?: ReactNode;
};

export function ExpenseListItem({ expense, highlighted, actions }: ExpenseListItemProps) {
  const theme = useTheme();
  const [isPhotoVisible, setIsPhotoVisible] = useState(false);

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.expenseCard, highlighted && { backgroundColor: theme.backgroundSelected }]}>
      <View style={styles.expenseHeaderRow}>
        <ThemedText type="smallBold" style={styles.expenseHeaderName}>
          {expense.category?.name ?? '(luokka poistettu)'}
        </ThemedText>
        <View style={photoStyles.headerActions}>
          {expense.receipt_photo_uri && (
            <Pressable onPress={() => setIsPhotoVisible(true)} hitSlop={Spacing.two}>
              <ThemedText type="small">📷</ThemedText>
            </Pressable>
          )}
          {actions}
        </View>
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

      {expense.receipt_photo_uri && (
        <Modal
          visible={isPhotoVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setIsPhotoVisible(false)}>
          <Pressable style={photoStyles.backdrop} onPress={() => setIsPhotoVisible(false)}>
            <Image
              source={{ uri: expense.receipt_photo_uri }}
              style={photoStyles.image}
              contentFit="contain"
            />
          </Pressable>
        </Modal>
      )}
    </ThemedView>
  );
}

const photoStyles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '90%',
  },
});
