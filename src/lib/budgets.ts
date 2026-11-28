import { supabase } from '@/lib/supabase';

export type Budget = {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  created_at: string;
};

export async function fetchBudgets(): Promise<{ data: Budget[]; error: string | null }> {
  const { data, error } = await supabase.from('budgets').select('*');
  return { data: (data ?? []) as Budget[], error: error?.message ?? null };
}

export function findBudgetAmount(budgets: Budget[], categoryId: string | null): number | null {
  const budget = budgets.find((b) => b.category_id === categoryId);
  return budget?.amount ?? null;
}

/** Creates or replaces the single budget for this user+scope (null
 * categoryId = the whole household). */
export async function setBudget(
  userId: string,
  categoryId: string | null,
  amount: number
): Promise<string | null> {
  const existingQuery = supabase.from('budgets').select('id');
  const { data: existing, error: selectError } = categoryId
    ? await existingQuery.eq('category_id', categoryId).maybeSingle()
    : await existingQuery.is('category_id', null).maybeSingle();

  if (selectError) return selectError.message;

  if (existing) {
    const { error } = await supabase.from('budgets').update({ amount }).eq('id', existing.id);
    return error?.message ?? null;
  }

  const { error } = await supabase
    .from('budgets')
    .insert({ user_id: userId, category_id: categoryId, amount });
  return error?.message ?? null;
}

export async function removeBudget(categoryId: string | null): Promise<string | null> {
  const deleteQuery = supabase.from('budgets').delete();
  const { error } = categoryId
    ? await deleteQuery.eq('category_id', categoryId)
    : await deleteQuery.is('category_id', null);
  return error?.message ?? null;
}
