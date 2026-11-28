import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExpenseListItem } from '@/components/expense-list-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { fetchBudgets, findBudgetAmount, removeBudget, setBudget, type Budget } from '@/lib/budgets';
import { groupByParent, type Category } from '@/lib/categories';
import { formatAmount, isoDateToFinnish, parseFinnishDate, type ExpenseWithCategory } from '@/lib/expenses';
import {
  countDaysInRange,
  elapsedPercentage,
  formatPeriodLabel,
  getPeriodRange,
  getPreviousRange,
  shiftReferenceDate,
  type DateRange,
  type PeriodKind,
} from '@/lib/period';
import { buildBreakdown, expensesInScope, parentScopeId, totalForScope } from '@/lib/summary';
import { supabase } from '@/lib/supabase';

const PERIOD_LABELS: Record<PeriodKind, string> = {
  week: 'Viikko',
  month: 'Kuukausi',
  year: 'Vuosi',
  custom: 'Mukautettu',
  allTime: 'Koko aika',
};

// Sentinel used only to mark "a range exists" for allTime, whose queries skip
// date filtering entirely rather than reading these bounds.
const ALL_TIME_RANGE: DateRange = { startIso: '0001-01-01', endIso: '9999-12-31' };

export default function SummaryScreen() {
  const theme = useTheme();
  const { session } = useAuth();

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
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInputText, setBudgetInputText] = useState('');
  const [budgetMessage, setBudgetMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const grouped = useMemo(() => groupByParent(categories), [categories]);

  const range: DateRange | null = useMemo(() => {
    if (periodKind === 'allTime') return ALL_TIME_RANGE;
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

  const fetchBudgetsList = useCallback(() => {
    fetchBudgets().then(({ data, error }) => {
      if (error) setErrorMessage(error);
      else setBudgets(data);
    });
  }, []);

  // Editing a budget is scoped to whichever category is currently shown -
  // leaving an edit open when the user drills into a different one would
  // otherwise silently apply to the wrong scope on save.
  useEffect(() => {
    setIsEditingBudget(false);
    setBudgetMessage('');
  }, [scopeCategoryId]);

  const fetchExpenses = useCallback(() => {
    if (!range) return;
    setIsLoading(true);
    setErrorMessage('');

    const isAllTime = periodKind === 'allTime';

    let currentQuery = supabase.from('expenses').select('*, category:categories(name)');
    if (!isAllTime) {
      currentQuery = currentQuery.gte('expense_date', range.startIso).lte('expense_date', range.endIso);
    }

    // "All time" has no preceding period to compare against.
    const previousQuery = isAllTime
      ? Promise.resolve({ data: [] as { category_id: string; amount: number }[], error: null })
      : (() => {
          const previousRange = getPreviousRange(range);
          return supabase
            .from('expenses')
            .select('category_id, amount')
            .gte('expense_date', previousRange.startIso)
            .lte('expense_date', previousRange.endIso);
        })();

    Promise.all([currentQuery.order('amount', { ascending: false }), previousQuery]).then(
      ([currentResult, previousResult]) => {
        if (currentResult.error) setErrorMessage(currentResult.error.message);
        else setExpenses(currentResult.data ?? []);

        if (previousResult.error) setErrorMessage(previousResult.error.message);
        else setPreviousExpenses(previousResult.data ?? []);

        setIsLoading(false);
      }
    );
  }, [range, periodKind]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useFocusEffect(
    useCallback(() => {
      fetchCategories();
      fetchExpenses();
      fetchBudgetsList();
    }, [fetchCategories, fetchExpenses, fetchBudgetsList])
  );

  const total = totalForScope(grouped, expenses, scopeCategoryId);
  const previousTotal = totalForScope(grouped, previousExpenses, scopeCategoryId);
  const breakdown = buildBreakdown(grouped, expenses, scopeCategoryId);
  const scopedExpenses = expensesInScope(grouped, expenses, scopeCategoryId);
  const topExpenses = [...scopedExpenses].sort((a, b) => b.amount - a.amount).slice(0, 5);
  const averagePerDay = range && periodKind !== 'allTime' ? total / countDaysInRange(range) : null;
  const comparisonPercentage = previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : null;
  const scopeName = scopeCategoryId
    ? (categories.find((category) => category.id === scopeCategoryId)?.name ?? 'Luokka poistettu')
    : 'Kaikki';
  const backScopeId = parentScopeId(categories, scopeCategoryId);
  const backLabel = backScopeId
    ? `← Takaisin: ${categories.find((category) => category.id === backScopeId)?.name ?? ''}`
    : '← Takaisin: Kaikki';

  // Budgets are always a flat monthly amount, so the comparison only makes
  // sense while viewing the "Kuukausi" period.
  const budgetAmount = periodKind === 'month' ? findBudgetAmount(budgets, scopeCategoryId) : null;
  const budgetSpentPercentage = budgetAmount ? (total / budgetAmount) * 100 : null;
  const budgetElapsedPercentage = range && periodKind === 'month' ? elapsedPercentage(range) : null;

  function startEditingBudget() {
    setBudgetInputText(budgetAmount !== null ? String(budgetAmount) : '');
    setBudgetMessage('');
    setIsEditingBudget(true);
  }

  async function handleSaveBudget() {
    const amountValue = Number(budgetInputText.replace(',', '.'));
    if (!budgetInputText || Number.isNaN(amountValue) || amountValue <= 0) {
      setBudgetMessage('Anna summa, joka on suurempi kuin 0.');
      return;
    }
    if (!session) return;

    const error = await setBudget(session.user.id, scopeCategoryId, amountValue);
    if (error) {
      setBudgetMessage(error);
      return;
    }

    setIsEditingBudget(false);
    fetchBudgetsList();
  }

  async function handleRemoveBudget() {
    const error = await removeBudget(scopeCategoryId);
    if (error) {
      setBudgetMessage(error);
      return;
    }

    setIsEditingBudget(false);
    fetchBudgetsList();
  }

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

          {periodKind === 'allTime' ? (
            <View style={styles.periodNavRow}>
              <ThemedText type="smallBold">Koko aika</ThemedText>
            </View>
          ) : periodKind !== 'custom' ? (
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
                <Pressable onPress={() => setScopeCategoryId(backScopeId)}>
                  <ThemedText type="linkPrimary">{backLabel}</ThemedText>
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
                {averagePerDay !== null && total > 0 && (
                  <ThemedText type="small" themeColor="textSecondary">
                    Keskimäärin {formatAmount(averagePerDay)} / päivä
                  </ThemedText>
                )}
              </ThemedView>

              {periodKind === 'month' && (
                <ThemedView type="backgroundElement" style={styles.budgetCard}>
                  <ThemedText type="smallBold">Budjetti - {scopeName}</ThemedText>

                  {budgetMessage && <ThemedText type="small">{budgetMessage}</ThemedText>}

                  {isEditingBudget ? (
                    <>
                      <TextInput
                        style={styles.input}
                        placeholder="Budjetti (€ / kk)"
                        placeholderTextColor="#8A8A8E"
                        keyboardType="decimal-pad"
                        value={budgetInputText}
                        onChangeText={setBudgetInputText}
                        autoFocus
                      />
                      <View style={styles.budgetEditActions}>
                        <Pressable
                          onPress={handleSaveBudget}
                          style={[styles.budgetSaveButton, { backgroundColor: theme.backgroundSelected }]}>
                          <ThemedText type="small">Tallenna</ThemedText>
                        </Pressable>
                        {budgetAmount !== null && (
                          <Pressable onPress={handleRemoveBudget}>
                            <ThemedText type="small" themeColor="textSecondary">
                              Poista budjetti
                            </ThemedText>
                          </Pressable>
                        )}
                        <Pressable onPress={() => setIsEditingBudget(false)}>
                          <ThemedText type="small" themeColor="textSecondary">
                            Peruuta
                          </ThemedText>
                        </Pressable>
                      </View>
                    </>
                  ) : budgetAmount !== null ? (
                    <>
                      <View style={styles.breakdownBarTrack}>
                        <View
                          style={[
                            styles.breakdownBarFill,
                            { width: `${Math.min(budgetSpentPercentage ?? 0, 100)}%` },
                            (budgetSpentPercentage ?? 0) > 100 && styles.budgetBarOverBudget,
                          ]}
                        />
                      </View>
                      <ThemedText type="small" themeColor="textSecondary">
                        {formatAmount(total)} / {formatAmount(budgetAmount)} (
                        {(budgetSpentPercentage ?? 0).toFixed(0)} % käytetty) - kuukaudesta kulunut{' '}
                        {(budgetElapsedPercentage ?? 0).toFixed(0)} %
                      </ThemedText>
                      <Pressable onPress={startEditingBudget}>
                        <ThemedText type="small" themeColor="textSecondary">
                          Muokkaa budjettia
                        </ThemedText>
                      </Pressable>
                    </>
                  ) : (
                    <Pressable onPress={startEditingBudget}>
                      <ThemedText type="small" themeColor="textSecondary">
                        + Aseta budjetti
                      </ThemedText>
                    </Pressable>
                  )}
                </ThemedView>
              )}

              {total === 0 && (
                <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
                  Ei menoja tällä ajalla.
                </ThemedText>
              )}

              {breakdown.length > 0 && (
                <View style={styles.section}>
                  <ThemedText type="smallBold">Luokat</ThemedText>
                  {breakdown.map((row) => {
                    // A row with the current scope's own id (the "Ei alaluokkaa"
                    // row for expenses booked directly on the parent) isn't a
                    // distinct category to drill into; every other row is.
                    const rowCanDrill = row.id !== scopeCategoryId;
                    const content = (
                      <>
                        <View style={styles.breakdownHeaderRow}>
                          <View style={styles.breakdownNameRow}>
                            <ThemedText type="small">{row.name}</ThemedText>
                            {rowCanDrill && (
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
                    return rowCanDrill ? (
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
    justifyContent: 'center',
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
  budgetCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  budgetEditActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  budgetSaveButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
  },
  budgetBarOverBudget: {
    backgroundColor: '#D64545',
  },
});
