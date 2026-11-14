import type { Frame, TextRecognitionResult } from '@react-native-ml-kit/text-recognition';

export type ReceiptItem = {
  name: string;
  price: number;
};

export type ParsedReceipt = {
  storeName: string | null;
  date: string | null;
  items: ReceiptItem[];
  total: number | null;
};

type PositionedLine = {
  text: string;
  frame: Frame;
};

// Matches a trailing price like "4,65", "1.49" or "4,65-" (discount) at the end of
// a row, optionally followed by a single lone digit (some receipts print a one-digit
// VAT-class column right after the price, e.g. IKEA's "3,99 0").
const PRICE_PATTERN = /(\d{1,3}[.,]\d{2})(-)?(?:\s+\d)?\s*$/;
const DATE_PATTERN = /\b\d{1,2}\.\d{1,2}\.\d{4}\b/;
const TOTAL_LABEL = 'YHTEENSA';

// A per-item K-Plussa loyalty discount printed as its own row right below the
// product it applies to - fold it into that product's price instead of
// dropping or double-counting it.
const DISCOUNT_LABEL = 'PLUSSAETU';

// Labels that mark a row as a receipt summary/metadata line rather than a purchased item.
// Matched against text normalized by `normalizeForMatch`, so these only need to be
// uppercase ASCII with no spaces/hyphens - diacritics and OCR word-splitting are
// already stripped out before comparing.
const SUMMARY_KEYWORDS = [
  TOTAL_LABEL,
  'ALV',
  'VERO',
  'KATEINEN',
  'TAKAISIN',
  'KANTAASIAKAS',
  'KORTTI',
  'OSTO', // covers "Ruokaostokset", "Käyttötavaraostokset" and "kerryttävät ostot"
  'KERRYTTAVAT', // backs up 'OSTO' when OCR misreads "ostot" as "0stot"
  'TASAERA',
  'SUMMA', // IKEA-style subtotal label (no "YHTEENSÄ" on these receipts at all)
  'PYORISTYS', // cash-rounding adjustment line
  'TUOTTEET', // "Tuotteet: 2" item-count line
];

// Uppercases, strips Finnish diacritics (ä/ö -> a/o) and removes whitespace/hyphens,
// so keyword matching survives both OCR word-splitting ("Käyttötavar aostokset")
// and diacritic rendering differences ("KATEINEN" vs "KÄTEINEN").
function normalizeForMatch(text: string): string {
  return text
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{Mark}/gu, '')
    .replace(/[\s-]+/g, '');
}

function collectLines(result: TextRecognitionResult): PositionedLine[] {
  const lines: PositionedLine[] = [];
  for (const block of result.blocks) {
    for (const line of block.lines) {
      const text = line.text.trim();
      if (text && line.frame) {
        lines.push({ text, frame: line.frame });
      }
    }
  }
  return lines;
}

/**
 * ML Kit groups text into blocks by its own layout heuristics, which on a narrow
 * tabular receipt often puts every product name in one block and every price in
 * another. Re-group the raw lines into physical rows by vertical position instead,
 * so a product and its price - which sit on the same printed line - end up together.
 */
function groupLinesIntoRows(lines: PositionedLine[]): PositionedLine[][] {
  const sorted = [...lines].sort((a, b) => a.frame.top - b.frame.top);
  const rows: PositionedLine[][] = [];

  for (const line of sorted) {
    const lineCenter = line.frame.top + line.frame.height / 2;
    const row = rows.find((candidate) => {
      const first = candidate[0];
      const rowCenter = first.frame.top + first.frame.height / 2;
      const tolerance = Math.min(first.frame.height, line.frame.height) * 0.6;
      return Math.abs(rowCenter - lineCenter) <= tolerance;
    });

    if (row) {
      row.push(line);
    } else {
      rows.push([line]);
    }
  }

  return rows.map((row) => row.sort((a, b) => a.frame.left - b.frame.left));
}

function rowText(row: PositionedLine[]): string {
  return row
    .map((line) => line.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parsePrice(digits: string, isNegative: boolean): number | null {
  const value = Number.parseFloat(digits.replace(',', '.'));
  if (Number.isNaN(value)) return null;
  return isNegative ? -value : value;
}

function extractItem(text: string): ReceiptItem | null {
  const match = text.match(PRICE_PATTERN);
  if (!match || match.index === undefined) return null;

  const price = parsePrice(match[1], match[2] === '-');
  if (price === null) return null;

  const name = text.slice(0, match.index).trim();
  if (!name) return null;

  return { name, price };
}

function isSummaryRow(text: string): boolean {
  // VAT-rate breakdown rows (e.g. "2 14,00% 13,28 1,87 15,15") don't contain
  // the "ALV" label themselves, only a percentage - catch those directly.
  if (text.includes('%')) return true;

  const normalized = normalizeForMatch(text);
  return SUMMARY_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export function parseReceipt(result: TextRecognitionResult): ParsedReceipt {
  const rows = groupLinesIntoRows(collectLines(result));
  const rowTexts = rows.map(rowText).filter(Boolean);

  const dateMatch = rowTexts.map((text) => text.match(DATE_PATTERN)).find(Boolean);
  const date = dateMatch ? dateMatch[0] : null;

  // Some receipts (e.g. IKEA) never print "YHTEENSÄ" at all - their subtotal
  // label "Summa" is the closest thing to a total they have.
  const totalRowText =
    rowTexts.find((text) => normalizeForMatch(text).includes(TOTAL_LABEL)) ??
    rowTexts.find((text) => normalizeForMatch(text).includes('SUMMA'));
  const total = totalRowText ? (extractItem(totalRowText)?.price ?? null) : null;

  const items: ReceiptItem[] = [];
  for (const text of rowTexts) {
    const item = extractItem(text);
    if (!item) continue;

    if (normalizeForMatch(item.name) === DISCOUNT_LABEL) {
      const previousItem = items[items.length - 1];
      if (previousItem) previousItem.price = Math.round((previousItem.price + item.price) * 100) / 100;
      continue;
    }

    if (isSummaryRow(text)) continue;
    items.push(item);
  }

  return {
    storeName: rowTexts[0] ?? null,
    date,
    items,
    total,
  };
}
