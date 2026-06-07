const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertBelowThousand(value: number): string {
  if (value <= 0) return '';
  if (value < 20) return ONES[value] ?? '';
  if (value < 100) {
    const tens = Math.floor(value / 10);
    const ones = value % 10;
    return `${TENS[tens] ?? ''}${ones ? ` ${ONES[ones]}` : ''}`.trim();
  }

  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  const hundredPart = `${ONES[hundreds]} Hundred`;
  if (!remainder) return hundredPart;
  return `${hundredPart} ${convertBelowThousand(remainder)}`.trim();
}

function convertIndianNumber(value: number): string {
  if (value === 0) return 'Zero';

  const parts: string[] = [];
  const crore = Math.floor(value / 10_000_000);
  const lakh = Math.floor((value % 10_000_000) / 100_000);
  const thousand = Math.floor((value % 100_000) / 1000);
  const remainder = value % 1000;

  if (crore) parts.push(`${convertBelowThousand(crore)} Crore`);
  if (lakh) parts.push(`${convertBelowThousand(lakh)} Lakh`);
  if (thousand) parts.push(`${convertBelowThousand(thousand)} Thousand`);
  if (remainder) parts.push(convertBelowThousand(remainder));

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/** SDD §27.16 — Indian rupees/paise amount in words (read-only on cheque print). */
export function toIndianRupeesWords(amount: number): string {
  const safeAmount = Math.max(0, amount);
  const rupees = Math.floor(safeAmount);
  const paise = Math.round((safeAmount - rupees) * 100);

  let words = `${convertIndianNumber(rupees)} Rupees`;
  if (paise > 0) {
    words += ` and ${convertIndianNumber(paise)} Paise`;
  }
  return `${words} Only`;
}
