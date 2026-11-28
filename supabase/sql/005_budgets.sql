-- Monthly budgets (issue #35/#36). category_id null = the whole household's
-- total budget; otherwise a specific (sub)category's own monthly budget.
-- Budgets are always a flat monthly amount - the Koosteet screen only shows
-- budget comparisons when viewing the "Kuukausi" period.
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create index if not exists budgets_user_id_idx on public.budgets(user_id);

-- Partial unique indexes rather than a single `unique (user_id, category_id)`
-- constraint: Postgres treats every NULL as distinct in a regular unique
-- constraint, which would allow multiple "whole household" (category_id
-- null) rows per user.
create unique index if not exists budgets_user_category_unique_idx
  on public.budgets (user_id, category_id)
  where category_id is not null;

create unique index if not exists budgets_user_total_unique_idx
  on public.budgets (user_id)
  where category_id is null;

alter table public.budgets enable row level security;

create policy "Users can view their own budgets"
  on public.budgets for select
  using (auth.uid() = user_id);

create policy "Users can insert their own budgets"
  on public.budgets for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own budgets"
  on public.budgets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own budgets"
  on public.budgets for delete
  using (auth.uid() = user_id);
