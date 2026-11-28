#!/usr/bin/env node
// Seeds random expenses for an existing test account, spread across the
// past months, so the Koosteet (summaries) screen has enough data to look
// at for every period (week/month/year/custom/all-time) and every category.
//
// Usage (run from the project root, where .env.local already has the
// Supabase project's URL/anon key for `expo start`):
//
//   SEED_EMAIL="testi@example.com" SEED_PASSWORD="..." node scripts/seed-test-data.mjs
//
// Optional: SEED_COUNT (default 200), SEED_MONTHS_BACK (default 18).
//
// The account must already exist and have at least one category (every
// new account gets default ones automatically, or create your own in the
// app first). This only adds rows - it never deletes or edits anything.

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnvLocal() {
  try {
    const text = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
    for (const line of text.split('\n')) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
    }
  } catch {
    // .env.local missing is fine if the vars are already set some other way.
  }
}

loadEnvLocal();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.SEED_EMAIL;
const password = process.env.SEED_PASSWORD;
const count = Number(process.env.SEED_COUNT ?? 200);
const monthsBack = Number(process.env.SEED_MONTHS_BACK ?? 18);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Puuttuu EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY (.env.local).');
  process.exit(1);
}
if (!email || !password) {
  console.error('Aseta SEED_EMAIL ja SEED_PASSWORD -ympäristömuuttujat testikäyttäjän tunnuksiksi.');
  process.exit(1);
}

// Rough item pools by keyword in the category name, so amounts/descriptions
// look at least plausible instead of "Ostos 1", "Ostos 2", ...
const ITEM_POOLS = [
  { match: /ruoka/i, items: ['K-Market', 'Prisma', 'Lidl', 'S-Market', 'Alepa'], min: 4, max: 85 },
  { match: /vaatt/i, items: ['H&M', 'Zalando', 'Lindex', 'Dressmann'], min: 10, max: 120 },
  { match: /harrastu/i, items: ['Kuntosalikortti', 'Uimahalli', 'Urheiluvaruste', 'Peli'], min: 5, max: 60 },
  { match: /ravintol/i, items: ['Lounas', 'Pizza', 'Kahvila', 'Illallinen'], min: 8, max: 55 },
  { match: /hygienia/i, items: ['Tokmanni', 'Apteekki', 'Parturi'], min: 3, max: 40 },
  { match: /sisustus/i, items: ['IKEA', 'Jysk', 'Clas Ohlson'], min: 10, max: 150 },
];
const DEFAULT_ITEMS = { items: ['Ostos'], min: 5, max: 80 };

function poolFor(categoryName) {
  return ITEM_POOLS.find((pool) => pool.match.test(categoryName)) ?? DEFAULT_ITEMS;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDateWithinMonths(months) {
  const daysBack = randomInt(0, months * 30);
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  return date.toISOString().slice(0, 10);
}

async function main() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError || !authData.user) {
    console.error('Kirjautuminen epäonnistui:', authError?.message);
    process.exit(1);
  }
  const userId = authData.user.id;

  const { data: categories, error: categoriesError } = await supabase.from('categories').select('*');
  if (categoriesError) {
    console.error('Luokkien hakeminen epäonnistui:', categoriesError.message);
    process.exit(1);
  }
  if (!categories || categories.length === 0) {
    console.error(
      'Tällä käyttäjällä ei ole yhtään luokkaa. Avaa sovellus kerran tällä tunnuksella (se luo oletusluokat) tai luo luokka Luokat-välilehdellä, ja aja tämä uudelleen.'
    );
    process.exit(1);
  }

  const rows = Array.from({ length: count }, () => {
    const category = categories[randomInt(0, categories.length - 1)];
    const pool = poolFor(category.name);
    const description = pool.items[randomInt(0, pool.items.length - 1)];
    return {
      user_id: userId,
      category_id: category.id,
      amount: randomInt(pool.min * 100, pool.max * 100) / 100,
      description,
      expense_date: randomDateWithinMonths(monthsBack),
    };
  });

  const { error: insertError } = await supabase.from('expenses').insert(rows);
  if (insertError) {
    console.error('Menojen lisääminen epäonnistui:', insertError.message);
    process.exit(1);
  }

  console.log(`Lisätty ${rows.length} testimenoa viimeisen ${monthsBack} kuukauden ajalle.`);
}

main();
