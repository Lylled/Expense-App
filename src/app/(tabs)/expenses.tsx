import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryActionMenu } from '@/components/category-action-menu';
import { CategoryDropdown } from '@/components/category-dropdown';
import { ExpenseListItem } from '@/components/expense-list-item';
import { expenseListStyles as sharedStyles } from '@/components/expense-list.styles';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { groupByParent, type Category } from '@/lib/categories';
import {
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

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      Promise.all([fetchExpenses(), fetchCategories()]).finally(() => setIsLoading(false));
    }, [])
  );

  async function fetchExpenses() {
    const { data, error } = await supabase
      .from('expenses')
      .select('*, category:categories(name)')
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) setErrorMessage(error.message);
    else setExpenses(data ?? []);
  }

  async function fetchCategories() {
    const { data, error } = await supabase.from('categories').select('*');

    if (error) setErrorMessage(error.message);
    else setCategories((data ?? []) as Category[]);
  }

  const grouped = useMemo(() => groupByParent(categories), [categories]);

  function resetForm() {
    setAmount('');
    setDescription('');
    setDateText(todayAsFinnishDate());
    setCategoryId(null);
    setEditingId(null);
  }

  function startEditingExpense(expense: ExpenseWithCategory) {
    setEditingId(expense.id);
    setAmount(String(expense.amount));
    setDescription(expense.description ?? '');
    setDateText(isoDateToFinnish(expense.expense_date));
    setCategoryId(expense.category_id);
  }

  async function handleSubmit() {
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

    if (!editingId && !session) return;

    const values = {
      category_id: categoryId,
      amount: amountValue,
      description: description.trim() || null,
      expense_date: isoDate,
    };

    const { error } = editingId
      ? await supabase.from('expenses').update(values).eq('id', editingId)
      : await supabase.from('expenses').insert({ ...values, user_id: session!.user.id });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    resetForm();
    fetchExpenses();
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
          else {
            if (editingId === id) resetForm();
            fetchExpenses();
          }
        },
      },
    ]);
  }

  return (
    <ThemedView style={sharedStyles.container}>
      <SafeAreaView style={sharedStyles.safeArea}>
        <ThemedText type="title" style={sharedStyles.title}>
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

          <View style={styles.formActions}>
            <Pressable style={styles.addButton} onPress={handleSubmit}>
              <ThemedText type="smallBold" style={styles.addButtonText}>
                {editingId ? 'Tallenna muutokset' : 'Lisää meno'}
              </ThemedText>
            </Pressable>
            {editingId && (
              <Pressable onPress={resetForm}>
                <ThemedText type="small">Peruuta muokkaus</ThemedText>
              </Pressable>
            )}
          </View>
        </ThemedView>

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
                Ei vielä menoja. Lisää ensimmäinen yllä.
              </ThemedText>
            }
            renderItem={({ item }) => (
              <ExpenseListItem
                expense={item}
                highlighted={editingId === item.id}
                actions={
                  <CategoryActionMenu
                    label={item.category?.name ?? 'Meno'}
                    onEdit={() => startEditingExpense(item)}
                    onDelete={() => confirmDeleteExpense(item.id)}
                  />
                }
              />
            )}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
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
  formActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  addButton: {
    flex: 1,
    backgroundColor: '#208AEF',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.five,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#ffffff',
  },
});
