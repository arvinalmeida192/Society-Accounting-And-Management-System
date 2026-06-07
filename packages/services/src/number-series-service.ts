import { SERIES_PREFIX, SeriesType } from '@sams/shared-types';

/**
 * Number series service stub — SDD §4.3, GAP-046
 * Atomic DB increment implemented in Phase 9/11.
 */
export class NumberSeriesService {
  formatNextNumber(type: SeriesType, year: number, sequence: number): string {
    const prefix = SERIES_PREFIX[type];
    const padded = String(sequence).padStart(4, '0');
    return `${prefix}-${year}-${padded}`;
  }

  /** @throws until Phase 9 implements atomic series increment */
  async next(type: SeriesType, financialYearId: string): Promise<string> {
    return Promise.reject(
      new Error(
        `NumberSeriesService.next(${type}, ${financialYearId}) is not implemented until Phase 9`,
      ),
    );
  }
}

export const numberSeriesService = new NumberSeriesService();
