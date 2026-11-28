-- Links an expense back to the receipt photo it was created from, when the
-- user has chosen to keep a copy in the app's own storage (Asetukset ->
-- Kuittikuvat -> Sovelluksen muisti). Null for manually-added expenses, or
-- when the photo wasn't kept (or was saved to the phone's own gallery
-- instead, which has no stable URI the app can read back later).
alter table public.expenses
  add column if not exists receipt_photo_uri text;
