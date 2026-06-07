import { SimpleInterestSubType } from '@sams/shared-types';

/** GAP-049 — inline help content from SRS §9.13 */
export const INTEREST_HELP_TEXT: Record<
  SimpleInterestSubType,
  { title: string; body: string }
> = {
  [SimpleInterestSubType.DELAY_DAYS]: {
    title: 'Delay Days',
    body:
      'Interest is charged only on amounts that remain unpaid beyond the due date. The interest accrues daily from the day after the due date. Formula: Interest = (Outstanding Amount × Annual Rate%) ÷ 365 × Number of Days Overdue. Each unpaid bill\'s overdue days are calculated independently.',
  },
  [SimpleInterestSubType.DELAY_MONTHS]: {
    title: 'Delay Months',
    body:
      'Interest is charged only on amounts that remain unpaid beyond the due date. The interest accrues per complete calendar month of delay. Formula: Interest = (Outstanding Amount × Annual Rate%) ÷ 12 × Number of Complete Months Overdue. Partial months are not counted.',
  },
  [SimpleInterestSubType.COMPLETE_CYCLE]: {
    title: 'Complete Cycle',
    body:
      'If any amount remains unpaid at the end of a billing cycle (regardless of how many days into the cycle the due date fell), interest is charged for the full cycle. Formula: Interest = Outstanding Amount × Rate% per cycle. This penalises any delay - even one day overdue triggers a full cycle\'s interest.',
  },
};

export function getInterestHelpText(subType: SimpleInterestSubType): {
  title: string;
  body: string;
} {
  return INTEREST_HELP_TEXT[subType];
}
