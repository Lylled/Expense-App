-- Run this once if you already executed the earlier version of
-- 002_seed_default_categories.sql, which seeded REMONTTI instead of
-- VAPAA-AIKA. It updates the trigger for future signups AND fixes
-- already-seeded accounts. Safe to re-run.

-- 1. Re-point the signup trigger at the new default set (same as the
-- current 002_seed_default_categories.sql).
create or replace function public.seed_default_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  koti_id uuid;
  vapaa_aika_id uuid;
begin
  insert into public.categories (user_id, name) values (new.id, 'KOTI') returning id into koti_id;
  insert into public.categories (user_id, name, parent_id) values
    (new.id, 'Ruoka', koti_id),
    (new.id, 'Hygienia', koti_id),
    (new.id, 'Sisustus', koti_id);

  insert into public.categories (user_id, name) values (new.id, 'VAPAA-AIKA') returning id into vapaa_aika_id;
  insert into public.categories (user_id, name, parent_id) values
    (new.id, 'Vaatteet', vapaa_aika_id),
    (new.id, 'Harrastukset', vapaa_aika_id),
    (new.id, 'Ravintolat', vapaa_aika_id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_seed_categories on auth.users;

create trigger on_auth_user_created_seed_categories
  after insert on auth.users
  for each row execute function public.seed_default_categories();

-- 2. Remove the old auto-seeded REMONTTI category. Its subcategories
-- cascade-delete automatically (categories.parent_id has ON DELETE CASCADE).
delete from public.categories
where name = 'REMONTTI' and parent_id is null;

-- 3. Give every user who doesn't have VAPAA-AIKA yet the new category.
do $$
declare
  existing_user record;
  vapaa_aika_id uuid;
begin
  for existing_user in
    select id from auth.users
    where not exists (
      select 1 from public.categories c
      where c.user_id = auth.users.id and c.name = 'VAPAA-AIKA' and c.parent_id is null
    )
  loop
    insert into public.categories (user_id, name)
      values (existing_user.id, 'VAPAA-AIKA') returning id into vapaa_aika_id;
    insert into public.categories (user_id, name, parent_id) values
      (existing_user.id, 'Vaatteet', vapaa_aika_id),
      (existing_user.id, 'Harrastukset', vapaa_aika_id),
      (existing_user.id, 'Ravintolat', vapaa_aika_id);
  end loop;
end $$;
