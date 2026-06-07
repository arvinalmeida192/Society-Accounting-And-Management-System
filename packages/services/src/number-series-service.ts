import type { PrismaClient } from '@prisma/client';
import { SeriesType as PrismaSeriesType } from '@prisma/client';
import { SERIES_PREFIX, SeriesType } from '@sams/shared-types';

const PRISMA_SERIES_MAP: Record<SeriesType, PrismaSeriesType> = {
  [SeriesType.MR]: PrismaSeriesType.MR,
  [SeriesType.GR]: PrismaSeriesType.GR,
  [SeriesType.CP]: PrismaSeriesType.CP,
  [SeriesType.BP]: PrismaSeriesType.BP,
  [SeriesType.CO]: PrismaSeriesType.CO,
  [SeriesType.JV]: PrismaSeriesType.JV,
  [SeriesType.DN]: PrismaSeriesType.DN,
  [SeriesType.CN]: PrismaSeriesType.CN,
  [SeriesType.RB]: PrismaSeriesType.RB,
  [SeriesType.SB]: PrismaSeriesType.SB,
};

export class NumberSeriesService {
  formatNextNumber(type: SeriesType, year: number, sequence: number): string {
    const prefix = SERIES_PREFIX[type];
    const padded = String(sequence).padStart(4, '0');
    return `${prefix}-${year}-${padded}`;
  }

  async next(
    client: PrismaClient,
    type: SeriesType,
    financialYearId: string,
    actorId: string,
    tx?: Pick<PrismaClient, 'voucherNumberSeries'>,
  ): Promise<string> {
    const db = tx ?? client;
    const fy = await client.financialYear.findUniqueOrThrow({ where: { id: financialYearId } });
    const year = fy.startDate.getFullYear();
    const prismaType = PRISMA_SERIES_MAP[type];
    const prefix = SERIES_PREFIX[type];

    const existing = await db.voucherNumberSeries.findUnique({
      where: { financialYearId_seriesType: { financialYearId, seriesType: prismaType } },
    });

    const nextNumber = (existing?.lastNumber ?? 0) + 1;

    if (existing) {
      await db.voucherNumberSeries.update({
        where: { id: existing.id },
        data: { lastNumber: nextNumber, updatedBy: actorId },
      });
    } else {
      await db.voucherNumberSeries.create({
        data: {
          financialYearId,
          seriesType: prismaType,
          prefix,
          lastNumber: nextNumber,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
    }

    return this.formatNextNumber(type, year, nextNumber);
  }
}

export const numberSeriesService = new NumberSeriesService();
