#!/usr/bin/env node
// Seeds realistic test expenses for an existing account, so the Koosteet
// (summaries) screen has something meaningful to look at.
//
// For each of the past months it adds the usual expenses of someone living
// alone: rent and a phone plan at a constant amount (those don't normally
// change month to month), plus electricity, groceries, clothing,
// restaurants and gym membership at amounts that vary like they do in real
// life. On top of that, it adds renovation-related purchases spread across
// the last few months and across several different categories, to
// demonstrate a project-style spike in spending that cuts across categories.
//
// Usage (run from the project root, where .env.local already has the
// Supabase project's URL/anon key for `expo start`):
//
//   SEED_EMAIL="testi@example.com" SEED_PASSWORD="..." node scripts/seed-test-data.mjs
//
// Optional: SEED_MONTHS_BACK (default 12), SEED_RENOVATION_MONTHS (default 6),
// SEED_RENOVATION_COUNT (default 20).
//
// The account must already exist and have at least one category (every new
// account gets default ones automatically, or create your own in the app
// first). This only adds rows - it never deletes or edits anything.

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
const monthsBack = Number(process.env.SEED_MONTHS_BACK ?? 12);
const renovationMonths = Number(process.env.SEED_RENOVATION_MONTHS ?? 6);
const renovationCount = Number(process.env.SEED_RENOVATION_COUNT ?? 20);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Puuttuu EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY (.env.local).');
  process.exit(1);
}
if (!email || !password) {
  console.error('Aseta SEED_EMAIL ja SEED_PASSWORD -ympäristömuuttujat testikäyttäjän tunnuksiksi.');
  process.exit(1);
}

// One fixed charge per month. Matched against the account's own category
// names, trying the more specific pattern first and falling back to the
// top-level "koti"-ish category (direct booking, no subcategory) when there
// isn't a dedicated one - skipped entirely if neither exists.
const MONTHLY_BILLS = [
  { description: 'Vuokra', patterns: [/vuokra/i, /koti/i], fixedAmount: 650, dayRange: [1, 5] },
  { description: 'Puhelinliittymä', patterns: [/puhelin/i, /koti/i], fixedAmount: 24.9, dayRange: [1, 28] },
  { description: 'Sähkölasku', patterns: [/sähkö/i, /koti/i], amountRange: [35, 130], dayRange: [10, 25] },
  { description: 'Kuntosalijäsenyys', patterns: [/harrastu/i, /vapaa/i], amountRange: [28, 33], dayRange: [1, 10] },
];

// Several purchases per month, each a varying amount from a varying store.
const RECURRING_PURCHASES = [
  {
    patterns: [/ruoka/i, /koti/i],
    pool: { items: ['K-Market', 'Prisma', 'Lidl', 'S-Market', 'Alepa'], min: 8, max: 70 },
    perMonth: [6, 12],
  },
  {
    patterns: [/vaatt/i, /vapaa/i],
    pool: { items: ['H&M', 'Zalando', 'Lindex', 'Dressmann'], min: 15, max: 120 },
    perMonth: [0, 2],
  },
  {
    patterns: [/ravintol/i, /vapaa/i],
    pool: { items: ['Lounasravintola', 'Pizzeria', 'Kahvila', 'Illallinen ravintolassa'], min: 9, max: 45 },
    perMonth: [2, 6],
  },
  {
    patterns: [/hygienia/i, /koti/i],
    pool: { items: ['Apteekki', 'Tokmanni', 'Parturi-kampaamo'], min: 6, max: 45 },
    perMonth: [0, 2],
  },
];

const RENOVATION_POOL = [
  { store: 'Bauhaus', description: 'Rakennustarvikkeet', min: 15, max: 220 },
  { store: 'K-Rauta', description: 'Maalit ja tarvikkeet', min: 20, max: 180 },
  { store: 'Stark', description: 'Puutavara', min: 25, max: 300 },
  { store: 'IKEA', description: 'Kalusteet', min: 30, max: 350 },
  { store: 'Clas Ohlson', description: 'Työkalut', min: 10, max: 150 },
  { store: 'Taloon.com', description: 'Valaisimet ja sähkötarvikkeet', min: 15, max: 250 },
];

function findCategory(categories, patterns) {
  for (const pattern of patterns) {
    const found = categories.find((category) => pattern.test(category.name));
    if (found) return found;
  }
  return null;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomAmount([min, max]) {
  return randomInt(min * 100, max * 100) / 100;
}

function daysInMonth(monthStart) {
  return new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
}

// A random "YYYY-MM-DD" within monthStart's month, clamped to today for the
// current month so nothing gets dated in the future.
function randomDayInMonth(monthStart, dayRange = [1, daysInMonth(monthStart)]) {
  const today = new Date();
  const isCurrentMonth =
    monthStart.getFullYear() === today.getFullYear() && monthStart.getMonth() === today.getMonth();
  const maxDay = Math.min(dayRange[1], isCurrentMonth ? today.getDate() : daysInMonth(monthStart));
  const minDay = Math.min(dayRange[0], maxDay);
  const day = randomInt(minDay, maxDay);
  return new Date(monthStart.getFullYear(), monthStart.getMonth(), day).toISOString().slice(0, 10);
}

function* monthsInRange(count) {
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    yield new Date(now.getFullYear(), now.getMonth() - i, 1);
  }
}

function makeRow(userId, category, description, amount, date) {
  return {
    user_id: userId,
    category_id: category.id,
    amount: Math.round(amount * 100) / 100,
    description,
    expense_date: date,
  };
}

function buildRows(categories, userId) {
  const rows = [];
  const months = [...monthsInRange(monthsBack)];

  for (const monthStart of months) {
    for (const bill of MONTHLY_BILLS) {
      const category = findCategory(categories, bill.patterns);
      if (!category) continue;
      const amount = bill.fixedAmount ?? randomAmount(bill.amountRange);
      rows.push(makeRow(userId, category, bill.description, amount, randomDayInMonth(monthStart, bill.dayRange)));
    }

    for (const purchase of RECURRING_PURCHASES) {
      const category = findCategory(categories, purchase.patterns);
      if (!category) continue;
      const tripCount = randomInt(purchase.perMonth[0], purchase.perMonth[1]);
      for (let i = 0; i < tripCount; i++) {
        const store = purchase.pool.items[randomInt(0, purchase.pool.items.length - 1)];
        const amount = randomAmount([purchase.pool.min, purchase.pool.max]);
        rows.push(makeRow(userId, category, store, amount, randomDayInMonth(monthStart)));
      }
    }
  }

  const renovationWindow = months.slice(-renovationMonths);
  for (let i = 0; i < renovationCount; i++) {
    const monthStart = renovationWindow[randomInt(0, renovationWindow.length - 1)];
    const category = categories[randomInt(0, categories.length - 1)];
    const item = RENOVATION_POOL[randomInt(0, RENOVATION_POOL.length - 1)];
    const amount = randomAmount([item.min, item.max]);
    rows.push(makeRow(userId, category, `${item.store}: ${item.description}`, amount, randomDayInMonth(monthStart)));
  }

  return rows;
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

  const rows = buildRows(categories, userId);

  const { error: insertError } = await supabase.from('expenses').insert(rows);
  if (insertError) {
    console.error('Menojen lisääminen epäonnistui:', insertError.message);
    process.exit(1);
  }

  console.log(
    `Lisätty ${rows.length} testimenoa: kuukausittaiset laskut/ostokset ${monthsBack} kuukaudelta, ` +
      `ja ${renovationCount} remonttikulua viimeisen ${renovationMonths} kuukauden ajalle.`
  );
}

main();
