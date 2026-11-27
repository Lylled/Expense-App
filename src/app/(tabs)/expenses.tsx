import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryActionMenu } from '@/components/category-action-menu';
import { CategoryDropdown } from '@/components/category-dropdown';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { groupByParent, type Category } from '@/lib/categories';
import {
  formatAmount,
  isoDateToFinnish,
  parseFinnishDate,
  todayAsFinnishDate,
  type ExpenseWithCategory,
} from '@/lib/expenses';
import { supabase } from '@/lib/supabase';

export default function ExpensesScreen() {
  const { session } = useAuth();

  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dateText, setDateText] = useState(todayAsFinnishDate());
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDateText, setEditDateText] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [])
  );

  async function fetchAll() {
    setIsLoading(true);
    const [expensesResult, categoriesResult] = await Promise.all([
      supabase
        .from('expenses')
        .select('*, category:categories(name)')
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('categories').select('*'),
    ]);

    if (expensesResult.error) setErrorMessage(expensesResult.error.message);
    else setExpenses(expensesResult.data ?? []);

    if (categoriesResult.error) setErrorMessage(categoriesResult.error.message);
    else setCategories((categoriesResult.data ?? []) as Category[]);

    setIsLoading(false);
  }

  const grouped = groupByParent(categories);

  async function handleAddExpense() {
    setErrorMessage('');

    const amountValue = Number(amount.replace(',', '.'));
    if (!amount || Number.isNaN(amountValue) || amountValue <= 0) {
      setErrorMessage('Anna summa, joka on suurempi kuin 0.');
      return;
    }

    const isoDate = parseFinnishDate(dateText);
    if (!isoDate) {
      setErrorMessage('Päivämäärä pitää olla muodossa pp.kk.vvvv.');
      return;
    }

    if (!categoryId) {
      setErrorMessage('Valitse luokka.');
      return;
    }

    if (!session) return;

    const { error } = await supabase.from('expenses').insert({
      user_id: session.user.id,
      category_id: categoryId,
      amount: amountValue,
      description: description.trim() || null,
      expense_date: isoDate,
    });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setAmount('');
    setDescription('');
    setDateText(todayAsFinnishDate());
    setCategoryId(null);
    fetchAll();
  }

  function startEditingExpense(expense: ExpenseWithCategory) {
    setEditingId(expense.id);
    setEditAmount(String(expense.amount));
    setEditDescription(expense.description ?? '');
    setEditDateText(isoDateToFinnish(expense.expense_date));
    setEditCategoryId(expense.category_id);
  }

  function cancelEditingExpense() {
    setEditingId(null);
    setEditAmount('');
    setEditDescription('');
    setEditDateText('');
    setEditCategoryId(null);
  }

  async function saveEditingExpense() {
    setErrorMessage('');

    const amountValue = Number(editAmount.replace(',', '.'));
    if (!editAmount || Number.isNaN(amountValue) || amountValue <= 0) {
      setErrorMessage('Anna summa, joka on suurempi kuin 0.');
      return;
    }

    const isoDate = parseFinnishDate(editDateText);
    if (!isoDate) {
      setErrorMessage('Päivämäärä pitää olla muodossa pp.kk.vvvv.');
      return;
    }

    if (!editCategoryId) {
      setErrorMessage('Valitse luokka.');
      return;
    }

    const { error } = await supabase
      .from('expenses')
      .update({
        category_id: editCategoryId,
        amount: amountValue,
        description: editDescription.trim() || null,
        expense_date: isoDate,
      })
      .eq('id', editingId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    cancelEditingExpense();
    fetchAll();
  }

  function confirmDeleteExpense(id: string) {
    Alert.alert('Poista meno', 'Haluatko varmasti poistaa tämän menon?', [
      { text: 'Peruuta', style: 'cancel' },
      {
        text: 'Poista',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('expenses').delete().eq('id', id);
          if (error) setErrorMessage(error.message);
          else fetchAll();
        },
      },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Menot
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Summa (€)"
            placeholderTextColor="#8A8A8E"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />
          <TextInput
            style={styles.input}
            placeholder="Kuvaus (valinnainen)"
            placeholderTextColor="#8A8A8E"
            value={description}
            onChangeText={setDescription}
          />
          <TextInput
            style={styles.input}
            placeholder="pp.kk.vvvv"
            placeholderTextColor="#8A8A8E"
            value={dateText}
            onChangeText={setDateText}
          />

          <CategoryDropdown
            categories={grouped}
            selectedCategoryId={categoryId}
            onSelect={setCategoryId}
          />

          <Pressable style={styles.addButton} onPress={handleAddExpense}>
            <ThemedText type="smallBold" style={styles.addButtonText}>
              Lisää meno
            </ThemedText>
          </Pressable>
        </ThemedView>

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
                Ei vielä menoja. Lisää ensimmäinen yllä.
              </ThemedText>
            }
            renderItem={({ item }) => (
              <ThemedView type="backgroundElement" style={styles.expenseCard}>
                <View style={styles.expenseHeaderRow}>
                  <ThemedText type="smallBold" style={styles.expenseHeaderName}>
                    {item.category?.name ?? '(luokka poistettu)'}
                  </ThemedText>
                  <CategoryActionMenu
                    label={item.category?.name ?? 'Meno'}
                    onEdit={() => startEditingExpense(item)}
                    onDelete={() => confirmDeleteExpense(item.id)}
                  />
                </View>

                {editingId === item.id ? (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="Summa (€)"
                      placeholderTextColor="#8A8A8E"
                      keyboardType="decimal-pad"
                      value={editAmount}
                      onChangeText={setEditAmount}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Kuvaus (valinnainen)"
                      placeholderTextColor="#8A8A8E"
                      value={editDescription}
                      onChangeText={setEditDescription}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="pp.kk.vvvv"
                      placeholderTextColor="#8A8A8E"
                      value={editDateText}
                      onChangeText={setEditDateText}
                    />
                    <CategoryDropdown
                      categories={grouped}
                      selectedCategoryId={editCategoryId}
                      onSelect={setEditCategoryId}
                    />
                    <View style={styles.editActions}>
                      <Pressable style={styles.addButton} onPress={saveEditingExpense}>
                        <ThemedText type="smallBold" style={styles.addButtonText}>
                          Tallenna
                        </ThemedText>
                      </Pressable>
                      <Pressable onPress={cancelEditingExpense}>
                        <ThemedText type="small">Peruuta</ThemedText>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <View style={styles.expenseRow}>
                    <View>
                      <ThemedText type="small" themeColor="textSecondary">
                        {item.description || '—'}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {item.expense_date}
                      </ThemedText>
                    </View>
                    <ThemedText type="smallBold">{formatAmount(item.amount)}</ThemedText>
                  </View>
                )}
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
  title: {
    textAlign: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  form: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#000000',
  },
  addButton: {
    backgroundColor: '#208AEF',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.five,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#ffffff',
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
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
