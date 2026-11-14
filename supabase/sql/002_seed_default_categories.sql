-- Gives every user a starting set of example categories (KOTI/VAPAA-AIKA and
-- their subcategories) so the app isn't empty on first use. Users can still
-- freely add, and later edit/delete (issue #19), their own categories.
--
-- NOTE: if you already ran an earlier version of this file that seeded
-- REMONTTI instead of VAPAA-AIKA, also run 003_replace_remontti_with_vapaa_aika.sql.

-- 1. Automatically seed categories for every NEW user from now on.
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

-- 2. One-off backfill for users who already exist (signed up before this
-- trigger existed) and don't have any categories yet. Safe to re-run: it
-- only touches users with zero categories.
do $$
declare
  existing_user record;
  koti_id uuid;
  vapaa_aika_id uuid;
begin
  for existing_user in
    select id from auth.users
    where not exists (
      select 1 from public.categories c where c.user_id = auth.users.id
    )
  loop
    insert into public.categories (user_id, name)
      values (existing_user.id, 'KOTI') returning id into koti_id;
    insert into public.categories (user_id, name, parent_id) values
      (existing_user.id, 'Ruoka', koti_id),
      (existing_user.id, 'Hygienia', koti_id),
      (existing_user.id, 'Sisustus', koti_id);

    insert into public.categories (user_id, name)
      values (existing_user.id, 'VAPAA-AIKA') returning id into vapaa_aika_id;
    insert into public.categories (user_id, name, parent_id) values
      (existing_user.id, 'Vaatteet', vapaa_aika_id),
      (existing_user.id, 'Harrastukset', vapaa_aika_id),
      (existing_user.id, 'Ravintolat', vapaa_aika_id);
  end loop;
end $$;
