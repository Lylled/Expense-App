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

// Matches a trailing price like "4,65", "1.49" or "4,65-" (discount) at the end of a row.
const PRICE_PATTERN = /(\d{1,3}[.,]\d{2})(-)?\s*$/;
const DATE_PATTERN = /\b\d{1,2}\.\d{1,2}\.\d{4}\b/;
const TOTAL_LABEL_PATTERN = /YHTEENS[AÄ]/i;

// Labels that mark a row as a receipt summary/metadata line rather than a purchased item.
const SUMMARY_KEYWORDS = [
  'YHTEENSA',
  'YHTEENSÄ',
  'ALV',
  'VERO',
  'VEROLLINEN',
  'VEROTON',
  'KATEINEN',
  'TAKAISIN',
  'KANTA-ASIAKAS',
  'KORTTI',
  'PLUSSA',
  'RUOKAOSTOKSET',
  'KAYTTOTAVARA',
  'KÄYTTÖTAVARA',
];

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
  const upper = text.toUpperCase();
  return SUMMARY_KEYWORDS.some((keyword) => upper.includes(keyword));
}

export function parseReceipt(result: TextRecognitionResult): ParsedReceipt {
  const rows = groupLinesIntoRows(collectLines(result));
  const rowTexts = rows.map(rowText).filter(Boolean);

  const dateMatch = rowTexts.map((text) => text.match(DATE_PATTERN)).find(Boolean);
  const date = dateMatch ? dateMatch[0] : null;

  const totalRowText = rowTexts.find((text) => TOTAL_LABEL_PATTERN.test(text));
  const total = totalRowText ? (extractItem(totalRowText)?.price ?? null) : null;

  const items: ReceiptItem[] = [];
  for (const text of rowTexts) {
    if (isSummaryRow(text)) continue;
    const item = extractItem(text);
    if (item) items.push(item);
  }

  return {
    storeName: rowTexts[0] ?? null,
    date,
    items,
    total,
  };
}
