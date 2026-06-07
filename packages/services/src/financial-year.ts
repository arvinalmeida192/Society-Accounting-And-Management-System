/** Generate FY label e.g. "2025-26" from start/end dates — SDD §24.6 */
export function generateFinancialYearLabel(startDate: Date, endDate: Date): string {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  if (endYear <= startYear) {
    return String(startYear);
  }

  return `${startYear}-${String(endYear).slice(-2)}`;
}

export function parseIsoDate(value: string, fieldName: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date for ${fieldName}`);
  }
  return date;
}
