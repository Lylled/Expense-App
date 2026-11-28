export type Expense = {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  description: string | null;
  expense_date: string;
  created_at: string;
  receipt_photo_uri: string | null;
};

export type ExpenseWithCategory = Expense & {
  category: { name: string } | null;
};

const DATE_INPUT_PATTERN = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;

export function todayAsFinnishDate(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${now.getFullYear()}`;
}

/** Parses a "pp.kk.vvvv" string into an ISO "YYYY-MM-DD" date, or null if invalid. */
export function parseFinnishDate(value: string): string | null {
  const match = value.trim().match(DATE_INPUT_PATTERN);
  if (!match) return null;

  const [, day, month, year] = match;
  const dayNum = Number(day);
  const monthNum = Number(month);
  if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) return null;

  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/** Formats an ISO "YYYY-MM-DD" date as "pp.kk.vvvv". */
export function isoDateToFinnish(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}.${month}.${year}`;
}

export function formatAmount(amount: number): string {
  return `${amount.toFixed(2).replace('.', ',')} €`;
}
