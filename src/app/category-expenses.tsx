import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { formatAmount, type ExpenseWithCategory } from '@/lib/expenses';
import { supabase } from '@/lib/supabase';

export default function CategoryExpensesScreen() {
  const { categoryId, categoryName } = useLocalSearchParams<{
    categoryId: string;
    categoryName: string;
  }>();

  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchExpenses();
  }, [categoryId]);

  async function fetchExpenses() {
    setIsLoading(true);
    setErrorMessage('');

    // A parent category's expenses include its subcategories' expenses too.
    const { data: children, error: childrenError } = await supabase
      .from('categories')
      .select('id')
      .eq('parent_id', categoryId);

    if (childrenError) {
      setErrorMessage(childrenError.message);
      setIsLoading(false);
      return;
    }

    const categoryIds = [categoryId, ...(children ?? []).map((child) => child.id)];

    const { data, error } = await supabase
      .from('expenses')
      .select('*, category:categories(name)')
      .in('category_id', categoryIds)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) setErrorMessage(error.message);
    else setExpenses(data ?? []);
    setIsLoading(false);
  }

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={Spacing.two}>
          <ThemedText type="link">Sulje</ThemedText>
        </Pressable>

        <ThemedText type="title" style={styles.title}>
          {categoryName}
        </ThemedText>

        {expenses.length > 0 && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
            Yhteensä {formatAmount(total)}
          </ThemedText>
        )}

        {errorMessage !== '' && (
          <ThemedText type="small" style={styles.centerText}>
            {errorMessage}
          </ThemedText>
        )}

        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <FlatList
            data={expenses}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
                Ei menoja tässä luokassa.
              </ThemedText>
            }
            renderItem={({ item }) => (
              <ThemedView type="backgroundElement" style={styles.expenseCard}>
                <View style={styles.expenseRow}>
                  <ThemedText type="smallBold">
                    {item.category?.name ?? '(luokka poistettu)'}
                  </ThemedText>
                  <ThemedText type="smallBold">{formatAmount(item.amount)}</ThemedText>
                </View>
                <View style={styles.expenseRow}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.description || '—'}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.expense_date}
                  </ThemedText>
                </View>
              </ThemedView>
            )}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
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
  closeButton: {
    alignSelf: 'flex-start',
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
});
