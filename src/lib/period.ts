export type PeriodKind = 'week' | 'month' | 'year' | 'custom' | 'allTime';

export type DateRange = {
  /** Inclusive, "YYYY-MM-DD". */
  startIso: string;
  /** Inclusive, "YYYY-MM-DD". */
  endIso: string;
};

const FINNISH_MONTHS = [
  'Tammikuu',
  'Helmikuu',
  'Maaliskuu',
  'Huhtikuu',
  'Toukokuu',
  'Kesäkuu',
  'Heinäkuu',
  'Elokuu',
  'Syyskuu',
  'Lokakuu',
  'Marraskuu',
  'Joulukuu',
];

const MS_PER_DAY = 86_400_000;

function toIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Parses "YYYY-MM-DD" as a local-time Date rather than `new Date(iso)`,
// which the spec parses as UTC and would shift the displayed day in
// timezones behind UTC.
function fromIso(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Monday of the week containing `date` (Finland's week starts on Monday). */
function startOfWeek(date: Date): Date {
  const day = date.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
}

/** The week/month/year range containing `referenceDate`. */
export function getPeriodRange(kind: 'week' | 'month' | 'year', referenceDate: Date): DateRange {
  if (kind === 'week') {
    const start = startOfWeek(referenceDate);
    return { startIso: toIso(start), endIso: toIso(addDays(start, 6)) };
  }
  if (kind === 'month') {
    const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
    return { startIso: toIso(start), endIso: toIso(end) };
  }
  const start = new Date(referenceDate.getFullYear(), 0, 1);
  const end = new Date(referenceDate.getFullYear(), 11, 31);
  return { startIso: toIso(start), endIso: toIso(end) };
}

/** Moves the reference date to the previous/next week, month, or year. */
export function shiftReferenceDate(
  kind: 'week' | 'month' | 'year',
  referenceDate: Date,
  direction: 1 | -1
): Date {
  if (kind === 'week') return addDays(referenceDate, direction * 7);
  if (kind === 'month') {
    return new Date(referenceDate.getFullYear(), referenceDate.getMonth() + direction, 1);
  }
  return new Date(referenceDate.getFullYear() + direction, referenceDate.getMonth(), 1);
}

export function countDaysInRange(range: DateRange): number {
  const start = fromIso(range.startIso);
  const end = fromIso(range.endIso);
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
}

/** The immediately preceding period of the same length, for comparison. */
export function getPreviousRange(range: DateRange): DateRange {
  const start = fromIso(range.startIso);
  const lengthDays = countDaysInRange(range);
  const previousEnd = addDays(start, -1);
  const previousStart = addDays(previousEnd, -(lengthDays - 1));
  return { startIso: toIso(previousStart), endIso: toIso(previousEnd) };
}

/** How far into the range today is, 0-100 - a past range reads 100, a
 * future one reads 0. For comparing budget pace against the calendar. */
export function elapsedPercentage(range: DateRange): number {
  const todayIso = toIso(new Date());
  if (todayIso < range.startIso) return 0;
  if (todayIso > range.endIso) return 100;

  const totalDays = countDaysInRange(range);
  const elapsedDays = countDaysInRange({ startIso: range.startIso, endIso: todayIso });
  return (elapsedDays / totalDays) * 100;
}

export function formatPeriodLabel(kind: PeriodKind, range: DateRange): string {
  const start = fromIso(range.startIso);
  const end = fromIso(range.endIso);

  if (kind === 'month') return `${FINNISH_MONTHS[start.getMonth()]} ${start.getFullYear()}`;
  if (kind === 'year') return String(start.getFullYear());

  const startLabel =
    start.getFullYear() === end.getFullYear()
      ? `${start.getDate()}.${start.getMonth() + 1}.`
      : `${start.getDate()}.${start.getMonth() + 1}.${start.getFullYear()}`;
  const endLabel = `${end.getDate()}.${end.getMonth() + 1}.${end.getFullYear()}`;
  return `${startLabel}–${endLabel}`;
}
