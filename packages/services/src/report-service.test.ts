import { describe, expect, it } from 'vitest';
import {
  listReportCatalog,
  renderReportHtml,
  reportToCsv,
} from './report-service.js';
import type { ReportResultDto } from '@sams/shared-types';

describe('report-service', () => {
  it('lists all Phase 18–19 billing, member, and accounting reports', () => {
    const catalog = listReportCatalog();
    expect(catalog).toHaveLength(28);
    expect(catalog.map((entry) => entry.reportId)).toContain('RPT-B05');
    expect(catalog.map((entry) => entry.reportId)).toContain('RPT-M01');
    expect(catalog.map((entry) => entry.reportId)).toContain('RPT-A05');
    expect(catalog.map((entry) => entry.reportId)).toContain('RPT-A12');
  });

  it('renders HTML with society header and table', () => {
    const sample: ReportResultDto = {
      reportId: 'RPT-B05',
      title: 'Contribution Summary',
      columns: [
        { key: 'billForPeriodLabel', label: 'Bill For' },
        { key: 'grandTotal', label: 'Total', align: 'right', format: 'currency' },
      ],
      rows: [
        { cells: { billForPeriodLabel: 'Apr-2025', grandTotal: 1000 } },
      ],
      metadata: {
        generatedAt: '2025-06-08T10:00:00.000Z',
        financialYearId: 'fy1',
        societyName: 'Test Society',
        fyLabel: '2025-26',
        parameters: {},
        supportsDrillDown: false,
        orientation: 'portrait',
      },
    };
    const html = renderReportHtml(sample);
    expect(html).toContain('Test Society');
    expect(html).toContain('Contribution Summary');
    expect(html).toContain('Apr-2025');
    expect(html).toContain('1,000.00');
  });

  it('exports CSV with quoted fields', () => {
    const sample: ReportResultDto = {
      reportId: 'RPT-B07',
      title: 'Outstanding Statement',
      columns: [{ key: 'memberName', label: 'Member' }],
      rows: [{ cells: { memberName: 'A, B' } }],
      metadata: {
        generatedAt: '2025-06-08T10:00:00.000Z',
        financialYearId: 'fy1',
        societyName: 'Test Society',
        fyLabel: '2025-26',
        parameters: {},
        supportsDrillDown: true,
        orientation: 'portrait',
      },
    };
    const csv = reportToCsv(sample);
    expect(csv).toBe('Member\n"A, B"');
  });
});
