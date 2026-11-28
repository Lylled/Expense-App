import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExpenseListItem } from '@/components/expense-list-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { groupByParent, type Category } from '@/lib/categories';
import { formatAmount, isoDateToFinnish, parseFinnishDate, type ExpenseWithCategory } from '@/lib/expenses';
import {
  countDaysInRange,
  formatPeriodLabel,
  getPeriodRange,
  getPreviousRange,
  shiftReferenceDate,
  type DateRange,
  type PeriodKind,
} from '@/lib/period';
import { buildBreakdown, expensesInScope, totalForScope } from '@/lib/summary';
import { supabase } from '@/lib/supabase';

const PERIOD_LABELS: Record<PeriodKind, string> = {
  week: 'Viikko',
  month: 'Kuukausi',
  year: 'Vuosi',
  custom: 'Mukautettu',
};

export default function SummaryScreen() {
  const theme = useTheme();

  const [categories, setCategories] = useState<Category[]>([]);
  const [periodKind, setPeriodKind] = useState<PeriodKind>('month');
  const [referenceDate, setReferenceDate] = useState(() => new Date());
  const [customStartText, setCustomStartText] = useState('');
  const [customEndText, setCustomEndText] = useState('');
  const [scopeCategoryId, setScopeCategoryId] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([]);
  const [previousExpenses, setPreviousExpenses] = useState<{ category_id: string; amount: number }[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const grouped = useMemo(() => groupByParent(categories), [categories]);

  const range: DateRange | null = useMemo(() => {
    if (periodKind !== 'custom') return getPeriodRange(periodKind, referenceDate);

    const startIso = parseFinnishDate(customStartText);
    const endIso = parseFinnishDate(customEndText);
    if (!startIso || !endIso || startIso > endIso) return null;
    return { startIso, endIso };
  }, [periodKind, referenceDate, customStartText, customEndText]);

  function selectPeriodKind(kind: PeriodKind) {
    if (kind === 'custom' && !customStartText && !customEndText) {
      const monthRange = getPeriodRange('month', referenceDate);
      setCustomStartText(isoDateToFinnish(monthRange.startIso));
      setCustomEndText(isoDateToFinnish(monthRange.endIso));
    }
    setPeriodKind(kind);
  }

  const fetchCategories = useCallback(() => {
    supabase
      .from('categories')
      .select('*')
      .then(({ data, error }) => {
        if (error) setErrorMessage(error.message);
        else setCategories((data ?? []) as Category[]);
      });
  }, []);

  const fetchExpenses = useCallback(() => {
    if (!range) return;
    setIsLoading(true);
    setErrorMessage('');

    const previousRange = getPreviousRange(range);

    Promise.all([
      supabase
        .from('expenses')
        .select('*, category:categories(name)')
        .gte('expense_date', range.startIso)
        .lte('expense_date', range.endIso)
        .order('amount', { ascending: false }),
      supabase
        .from('expenses')
        .select('category_id, amount')
        .gte('expense_date', previousRange.startIso)
        .lte('expense_date', previousRange.endIso),
    ]).then(([currentResult, previousResult]) => {
      if (currentResult.error) setErrorMessage(currentResult.error.message);
      else setExpenses(currentResult.data ?? []);

      if (previousResult.error) setErrorMessage(previousResult.error.message);
      else setPreviousExpenses(previousResult.data ?? []);

      setIsLoading(false);
    });
  }, [range]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useFocusEffect(
    useCallback(() => {
      fetchCategories();
      fetchExpenses();
    }, [fetchCategories, fetchExpenses])
  );

  const total = totalForScope(grouped, expenses, scopeCategoryId);
  const previousTotal = totalForScope(grouped, previousExpenses, scopeCategoryId);
  const breakdown = buildBreakdown(grouped, expenses, scopeCategoryId);
  const scopedExpenses = expensesInScope(grouped, expenses, scopeCategoryId);
  const topExpenses = [...scopedExpenses].sort((a, b) => b.amount - a.amount).slice(0, 5);
  const averagePerDay = range ? total / countDaysInRange(range) : 0;
  const comparisonPercentage = previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : null;
  const scopeName = scopeCategoryId
    ? (categories.find((category) => category.id === scopeCategoryId)?.name ?? 'Luokka poistettu')
    : 'Kaikki';
  const canDrill = scopeCategoryId === null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <ThemedText type="title" style={styles.title}>
            Koosteet
          </ThemedText>

          <View style={styles.periodKindRow}>
            {(Object.keys(PERIOD_LABELS) as PeriodKind[]).map((kind) => (
              <Pressable
                key={kind}
                onPress={() => selectPeriodKind(kind)}
                style={[
                  styles.periodKindChip,
                  { backgroundColor: periodKind === kind ? theme.backgroundSelected : theme.backgroundElement },
                ]}>
                <ThemedText type="small">{PERIOD_LABELS[kind]}</ThemedText>
              </Pressable>
            ))}
          </View>

          {periodKind !== 'custom' ? (
            <View style={styles.periodNavRow}>
              <Pressable
                onPress={() => setReferenceDate((current) => shiftReferenceDate(periodKind, current, -1))}
                hitSlop={Spacing.two}>
                <ThemedText type="smallBold">‹</ThemedText>
              </Pressable>
              <ThemedText type="smallBold">
                {range ? formatPeriodLabel(periodKind, range) : ''}
              </ThemedText>
              <Pressable
                onPress={() => setReferenceDate((current) => shiftReferenceDate(periodKind, current, 1))}
                hitSlop={Spacing.two}>
                <ThemedText type="smallBold">›</ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.customRangeRow}>
              <TextInput
                style={[styles.input, styles.customDateInput]}
                placeholder="Alku pp.kk.vvvv"
                placeholderTextColor="#8A8A8E"
                value={customStartText}
                onChangeText={setCustomStartText}
              />
              <TextInput
                style={[styles.input, styles.customDateInput]}
                placeholder="Loppu pp.kk.vvvv"
                placeholderTextColor="#8A8A8E"
                value={customEndText}
                onChangeText={setCustomEndText}
              />
            </View>
          )}

          {!range && (
            <ThemedText type="small" style={styles.centerText}>
              Anna kelvollinen päivämääräväli (pp.kk.vvvv), alku ennen loppua.
            </ThemedText>
          )}

          {errorMessage && (
            <ThemedText type="small" style={styles.centerText}>
              {errorMessage}
            </ThemedText>
          )}

          {range && !isLoading && (
            <>
              {scopeCategoryId && (
                <Pressable onPress={() => setScopeCategoryId(null)}>
                  <ThemedText type="linkPrimary">← Takaisin: Kaikki</ThemedText>
                </Pressable>
              )}

              <ThemedView type="backgroundElement" style={styles.totalCard}>
                <ThemedText type="small" themeColor="textSecondary">
                  {scopeName}
                </ThemedText>
                <ThemedText type="subtitle" style={styles.totalAmount}>
                  {formatAmount(total)}
                </ThemedText>
                {comparisonPercentage !== null && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {comparisonPercentage >= 0 ? '+' : ''}
                    {comparisonPercentage.toFixed(1)} % edelliseen jaksoon verrattuna
                  </ThemedText>
                )}
                {total > 0 && (
                  <ThemedText type="small" themeColor="textSecondary">
                    Keskimäärin {formatAmount(averagePerDay)} / päivä
                  </ThemedText>
                )}
              </ThemedView>

              {total === 0 && (
                <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
                  Ei menoja tällä ajalla.
                </ThemedText>
              )}

              {breakdown.length > 0 && (
                <View style={styles.section}>
                  <ThemedText type="smallBold">Luokat</ThemedText>
                  {breakdown.map((row) => {
                    const content = (
                      <>
                        <View style={styles.breakdownHeaderRow}>
                          <View style={styles.breakdownNameRow}>
                            <ThemedText type="small">{row.name}</ThemedText>
                            {canDrill && (
                              <ThemedText type="small" themeColor="textSecondary">
                                ›
                              </ThemedText>
                            )}
                          </View>
                          <ThemedText type="small">
                            {formatAmount(row.amount)} ({row.percentage.toFixed(0)} %)
                          </ThemedText>
                        </View>
                        <View style={styles.breakdownBarTrack}>
                          <View style={[styles.breakdownBarFill, { width: `${row.percentage}%` }]} />
                        </View>
                      </>
                    );
                    return canDrill ? (
                      <Pressable key={row.id} onPress={() => setScopeCategoryId(row.id)}>
                        {({ pressed }) => (
                          <ThemedView
                            type="backgroundElement"
                            style={[styles.breakdownCard, pressed && styles.breakdownCardPressed]}>
                            {content}
                          </ThemedView>
                        )}
                      </Pressable>
                    ) : (
                      <View key={row.id} style={styles.breakdownRow}>
                        {content}
                      </View>
                    );
                  })}
                </View>
              )}

              {topExpenses.length > 0 && (
                <View style={styles.section}>
                  <ThemedText type="smallBold">Suurimmat menot</ThemedText>
                  {topExpenses.map((expense) => (
                    <ExpenseListItem key={expense.id} expense={expense} />
                  ))}
                </View>
              )}
            </>
          )}

          {range && isLoading && <ActivityIndicator />}
        </ScrollView>
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
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  scroll: {
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  title: {
    textAlign: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  periodKindRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  periodKindChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  periodNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
  },
  customRangeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#000000',
  },
  customDateInput: {
    flex: 1,
  },
  totalCard: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.one,
    alignItems: 'center',
  },
  totalAmount: {
    textAlign: 'center',
  },
  section: {
    gap: Spacing.two,
  },
  breakdownRow: {
    gap: Spacing.one,
  },
  breakdownCard: {
    borderRadius: Spacing.two,
    padding: Spacing.two,
    gap: Spacing.one,
  },
  breakdownCardPressed: {
    opacity: 0.7,
  },
  breakdownHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  breakdownBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8A8A8E33',
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#208AEF',
  },
});
