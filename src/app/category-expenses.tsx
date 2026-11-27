import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExpenseListItem } from '@/components/expense-list-item';
import { expenseListStyles as sharedStyles } from '@/components/expense-list.styles';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
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
    <ThemedView style={sharedStyles.container}>
      <SafeAreaView style={sharedStyles.safeArea}>
        <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={Spacing.two}>
          <ThemedText type="link">Sulje</ThemedText>
        </Pressable>

        <ThemedText type="title" style={sharedStyles.title}>
          {categoryName}
        </ThemedText>

        {expenses.length > 0 && (
          <ThemedText type="small" themeColor="textSecondary" style={sharedStyles.centerText}>
            Yhteensä {formatAmount(total)}
          </ThemedText>
        )}

        {errorMessage && (
          <ThemedText type="small" style={sharedStyles.centerText}>
            {errorMessage}
          </ThemedText>
        )}

        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <FlatList
            data={expenses}
            keyExtractor={(item) => item.id}
            contentContainerStyle={sharedStyles.listContent}
            ListEmptyComponent={
              <ThemedText type="small" themeColor="textSecondary" style={sharedStyles.centerText}>
                Ei menoja tässä luokassa.
              </ThemedText>
            }
            renderItem={({ item }) => <ExpenseListItem expense={item} />}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    alignSelf: 'flex-start',
  },
});
