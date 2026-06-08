import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import type {
  MemberListItemDto,
  ReportId,
  ReportResultDto,
} from '@sams/shared-types';
import { PrintPreviewModal } from '../../components';
import { getIpcErrorMessage } from '../../hooks/session';

const MEMBER_REPORTS = new Set<ReportId>([
  'RPT-B03',
  'RPT-B04',
  'RPT-B06',
  'RPT-M02',
  'RPT-M04',
  'RPT-M08',
]);

const PERIOD_REPORTS = new Set<ReportId>(['RPT-B01', 'RPT-B02']);

const FILTER_REPORTS = new Set<ReportId>([
  'RPT-B01',
  'RPT-B02',
  'RPT-B07',
  'RPT-M01',
  'RPT-M03',
]);

function formatCell(value: string | number | null | undefined): string {
  if (value == null) return '';
  if (typeof value === 'number') {
    return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return String(value);
}

/** Phase 18 — Run, preview, export, and print a single report. */
export function ReportViewerScreen(): React.ReactElement {
  const { reportId: reportIdParam } = useParams<{ reportId: ReportId }>();
  const [searchParams] = useSearchParams();
  const reportId = reportIdParam as ReportId;

  const [members, setMembers] = useState<MemberListItemDto[]>([]);
  const [memberId, setMemberId] = useState(searchParams.get('memberId') ?? '');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [wingId, setWingId] = useState('');
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<ReportResultDto | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const parameters = useMemo(
    () => ({
      ...(memberId ? { memberId } : {}),
      ...(periodFrom ? { periodFrom } : {}),
      ...(periodTo ? { periodTo } : {}),
      ...(buildingId ? { buildingId } : {}),
      ...(wingId ? { wingId } : {}),
      ...(search ? { search } : {}),
    }),
    [memberId, periodFrom, periodTo, buildingId, wingId, search],
  );

  useEffect(() => {
    void (async () => {
      const response = await window.sams.member.list();
      if (response.success && response.data) {
        setMembers(response.data.items);
      }
    })();
  }, []);

  const runReport = useCallback(async (): Promise<void> => {
    if (!reportId) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    const response = await window.sams.report.run({ reportId, parameters });
    setLoading(false);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setResult(response.data);
    setMessage(`Report generated with ${response.data.rows.length} row(s).`);
  }, [reportId, parameters]);

  useEffect(() => {
    if (searchParams.get('autoRun') === '1') {
      void runReport();
    }
  }, [runReport, searchParams]);

  const preview = async (): Promise<void> => {
    if (!reportId) return;
    setError(null);
    const response = await window.sams.report.preview({ reportId, parameters });
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setResult(response.data.result);
    setPreviewHtml(response.data.html);
    setPreviewOpen(true);
  };

  const exportCsv = async (): Promise<void> => {
    if (!reportId) return;
    const response = await window.sams.report.exportCsv({ reportId, parameters });
    if (!response.success) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    if (response.data?.path) setMessage(`CSV saved to ${response.data.path}`);
  };

  const exportPdf = async (): Promise<void> => {
    if (!reportId) return;
    const response = await window.sams.report.exportPdf({ reportId, parameters });
    if (!response.success) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    if (response.data?.path) setMessage(`PDF saved to ${response.data.path}`);
  };

  if (!reportId) {
    return (
      <section className="form-screen">
        <p className="error-text">Report not specified.</p>
      </section>
    );
  }

  return (
    <section className="form-screen report-viewer">
      <h2>{result?.title ?? reportId}</h2>
      <p className="muted">Configure parameters and run the report.</p>

      <div className="form-grid">
        {MEMBER_REPORTS.has(reportId) && (
          <label>
            Member
            <select value={memberId} onChange={(event) => setMemberId(event.target.value)}>
              <option value="">Select member</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.memberName} — {member.buildingShortName}/{member.wingShortName}/{member.unitNo}
                </option>
              ))}
            </select>
          </label>
        )}

        {PERIOD_REPORTS.has(reportId) && (
          <>
            <label>
              Period from
              <input
                type="text"
                placeholder="YYYY-MM"
                value={periodFrom}
                onChange={(event) => setPeriodFrom(event.target.value)}
              />
            </label>
            <label>
              Period to
              <input
                type="text"
                placeholder="YYYY-MM"
                value={periodTo}
                onChange={(event) => setPeriodTo(event.target.value)}
              />
            </label>
          </>
        )}

        {FILTER_REPORTS.has(reportId) && (
          <>
            <label>
              Building ID
              <input value={buildingId} onChange={(event) => setBuildingId(event.target.value)} />
            </label>
            <label>
              Wing ID
              <input value={wingId} onChange={(event) => setWingId(event.target.value)} />
            </label>
          </>
        )}

        {(reportId === 'RPT-M05' || reportId === 'RPT-M06' || reportId === 'RPT-M07') && (
          <label>
            Search
            <input value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
        )}
      </div>

      <div className="toolbar-row">
        <button type="button" disabled={loading} onClick={() => void runReport()}>
          Run
        </button>
        <button type="button" onClick={() => void preview()}>
          Print Preview
        </button>
        <button type="button" onClick={() => void exportCsv()}>
          Export CSV
        </button>
        <button type="button" onClick={() => void exportPdf()}>
          Export PDF
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="success-text">{message}</p>}

      {result && (
        <div className="report-grid-wrap">
          <table className="data-grid">
            <thead>
              <tr>
                {result.columns.map((col) => (
                  <th key={col.key} style={col.align === 'right' ? { textAlign: 'right' } : undefined}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, index) => (
                <tr key={index}>
                  {result.columns.map((col) => (
                    <td
                      key={col.key}
                      style={col.align === 'right' ? { textAlign: 'right' } : undefined}
                    >
                      {formatCell(row.cells[col.key] as string | number | null)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PrintPreviewModal
        open={previewOpen}
        title={result?.title ?? 'Report Preview'}
        html={previewHtml ?? ''}
        onClose={() => setPreviewOpen(false)}
        onPrint={() => window.print()}
      />
    </section>
  );
}
