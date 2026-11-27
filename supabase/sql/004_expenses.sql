-- Manually added expenses (issue #6). category_id is required - every
-- expense belongs to exactly one (sub)category - and cascades on delete,
-- consistent with "deleting a category deletes its content" (issue #19).
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  description text,
  expense_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists expenses_user_id_idx on public.expenses(user_id);
create index if not exists expenses_category_id_idx on public.expenses(category_id);
create index if not exists expenses_expense_date_idx on public.expenses(expense_date);

alter table public.expenses enable row level security;

create policy "Users can view their own expenses"
  on public.expenses for select
  using (auth.uid() = user_id);

create policy "Users can insert their own expenses"
  on public.expenses for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own expenses"
  on public.expenses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own expenses"
  on public.expenses for delete
  using (auth.uid() = user_id);
