import type { Category, CategoryWithChildren } from '@/lib/categories';

export type SummaryExpense = {
  category_id: string;
  amount: number;
};

export type BreakdownRow = {
  id: string;
  name: string;
  amount: number;
  percentage: number;
};

// null means "no filter" (root scope: every expense counts).
function idsForScope(
  grouped: CategoryWithChildren[],
  scopeCategoryId: string | null
): Set<string> | null {
  if (!scopeCategoryId) return null;
  const parent = grouped.find((category) => category.id === scopeCategoryId);
  return parent
    ? new Set([parent.id, ...parent.children.map((child) => child.id)])
    : new Set([scopeCategoryId]);
}

export function totalForScope(
  grouped: CategoryWithChildren[],
  expenses: SummaryExpense[],
  scopeCategoryId: string | null
): number {
  const ids = idsForScope(grouped, scopeCategoryId);
  return expenses.reduce((sum, expense) => {
    if (ids && !ids.has(expense.category_id)) return sum;
    return sum + expense.amount;
  }, 0);
}

/** Breakdown rows for a scope: root -> its top-level categories (each
 * summing its own + its children's expenses); a top-level category -> its
 * children, plus an "Ei alaluokkaa" row for any expenses booked directly on
 * it. A subcategory scope has nothing further to break down into. */
export function buildBreakdown(
  grouped: CategoryWithChildren[],
  expenses: SummaryExpense[],
  scopeCategoryId: string | null
): BreakdownRow[] {
  const sums = new Map<string, number>();
  for (const expense of expenses) {
    sums.set(expense.category_id, (sums.get(expense.category_id) ?? 0) + expense.amount);
  }

  let entries: { id: string; name: string; amount: number }[];

  if (!scopeCategoryId) {
    entries = grouped.map((category) => ({
      id: category.id,
      name: category.name,
      amount:
        (sums.get(category.id) ?? 0) +
        category.children.reduce((sum, child) => sum + (sums.get(child.id) ?? 0), 0),
    }));
  } else {
    const parent = grouped.find((category) => category.id === scopeCategoryId);
    if (!parent || parent.children.length === 0) return [];

    entries = parent.children.map((child) => ({
      id: child.id,
      name: child.name,
      amount: sums.get(child.id) ?? 0,
    }));

    const ownAmount = sums.get(parent.id) ?? 0;
    if (ownAmount > 0) entries.push({ id: parent.id, name: 'Ei alaluokkaa', amount: ownAmount });
  }

  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
  return entries
    .filter((entry) => entry.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .map((entry) => ({
      ...entry,
      percentage: total > 0 ? (entry.amount / total) * 100 : 0,
    }));
}

/** The scope to return to when stepping back one level: a subcategory's
 * parent category, or null (root) from a top-level category. */
export function parentScopeId(categories: Category[], scopeCategoryId: string | null): string | null {
  if (!scopeCategoryId) return null;
  return categories.find((category) => category.id === scopeCategoryId)?.parent_id ?? null;
}

export function expensesInScope<T extends SummaryExpense>(
  grouped: CategoryWithChildren[],
  expenses: T[],
  scopeCategoryId: string | null
): T[] {
  const ids = idsForScope(grouped, scopeCategoryId);
  return ids ? expenses.filter((expense) => ids.has(expense.category_id)) : expenses;
}
