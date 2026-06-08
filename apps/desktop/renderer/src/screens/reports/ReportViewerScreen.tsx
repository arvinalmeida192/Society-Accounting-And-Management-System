import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type {
  AccountPickerItem,
  BuildingDto,
  MemberListItemDto,
  ReportId,
  ReportResultDto,
  ReportRowDrillDown,
} from '@sams/shared-types';
import { VoucherType } from '@sams/shared-types';
import { BillReadonlyModal, PrintPreviewModal, VoucherReadonlyModal } from '../../components';
import { getIpcErrorMessage } from '../../hooks/session';
import { useTabStore } from '../../store/tabStore';

const MEMBER_REPORTS = new Set<ReportId>([
  'RPT-B03',
  'RPT-B04',
  'RPT-B06',
  'RPT-M02',
  'RPT-M04',
  'RPT-M08',
]);

const PERIOD_REPORTS = new Set<ReportId>(['RPT-B01', 'RPT-B02']);

const BUILDING_FILTER_REPORTS = new Set<ReportId>([
  'RPT-B01',
  'RPT-B02',
  'RPT-B07',
  'RPT-M01',
  'RPT-M03',
]);

const DATE_RANGE_REPORTS = new Set<ReportId>([
  'RPT-B03',
  'RPT-M08',
  'RPT-A01',
  'RPT-A02',
  'RPT-A03',
  'RPT-A04',
  'RPT-A07',
  'RPT-A08',
  'RPT-A12',
]);

const AS_ON_REPORTS = new Set<ReportId>(['RPT-A05', 'RPT-A06', 'RPT-A09']);

const ACCOUNT_REPORTS = new Set<ReportId>(['RPT-A04']);

const BANK_ACCOUNT_REPORTS = new Set<ReportId>(['RPT-A03', 'RPT-A09']);

const VOUCHER_TYPE_REPORTS = new Set<ReportId>(['RPT-A01']);

const BANK_SLIP_REPORTS = new Set<ReportId>(['RPT-A10']);

const DAY_BOOK_REPORTS = new Set<ReportId>(['RPT-A11']);

function formatCell(value: string | number | null | undefined): string {
  if (value == null) return '';
  if (typeof value === 'number') {
    return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return String(value);
}

/** Phase 18–19 — Run, preview, export, print, and drill-down for reports. */
export function ReportViewerScreen(): React.ReactElement {
  const { reportId: reportIdParam } = useParams<{ reportId: ReportId }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const openTab = useTabStore((state) => state.openTab);
  const reportId = reportIdParam as ReportId;

  const [members, setMembers] = useState<MemberListItemDto[]>([]);
  const [buildings, setBuildings] = useState<BuildingDto[]>([]);
  const [bankAccounts, setBankAccounts] = useState<AccountPickerItem[]>([]);
  const [ledgerAccounts, setLedgerAccounts] = useState<AccountPickerItem[]>([]);

  const [memberId, setMemberId] = useState(searchParams.get('memberId') ?? '');
  const [partyAccountId, setPartyAccountId] = useState(searchParams.get('partyAccountId') ?? '');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [asOnDate, setAsOnDate] = useState(new Date().toISOString().slice(0, 10));
  const [dayDate, setDayDate] = useState(new Date().toISOString().slice(0, 10));
  const [buildingId, setBuildingId] = useState('');
  const [wingId, setWingId] = useState('');
  const [accountId, setAccountId] = useState(searchParams.get('accountId') ?? '');
  const [bankAccountId, setBankAccountId] = useState('');
  const [bankSlipNo, setBankSlipNo] = useState('');
  const [voucherType, setVoucherType] = useState('');
  const [search, setSearch] = useState('');

  const [result, setResult] = useState<ReportResultDto | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [drillBillId, setDrillBillId] = useState<string | null>(null);
  const [drillVoucherId, setDrillVoucherId] = useState<string | null>(null);
  const [letterPreviewHtml, setLetterPreviewHtml] = useState<string | null>(null);
  const [letterPreviewOpen, setLetterPreviewOpen] = useState(false);

  const parameters = useMemo(
    () => ({
      ...(memberId ? { memberId } : {}),
      ...(periodFrom ? { periodFrom } : {}),
      ...(periodTo ? { periodTo } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
      ...(asOnDate ? { asOnDate } : {}),
      ...(dayDate ? { date: dayDate } : {}),
      ...(buildingId ? { buildingId } : {}),
      ...(wingId ? { wingId } : {}),
      ...(accountId ? { accountId } : {}),
      ...(bankAccountId ? { bankAccountId } : {}),
      ...(bankSlipNo ? { bankSlipNo } : {}),
      ...(voucherType ? { voucherType } : {}),
      ...(search ? { search } : {}),
      ...(partyAccountId ? { partyAccountId } : {}),
    }),
    [
      memberId,
      partyAccountId,
      periodFrom,
      periodTo,
      dateFrom,
      dateTo,
      asOnDate,
      dayDate,
      buildingId,
      wingId,
      accountId,
      bankAccountId,
      bankSlipNo,
      voucherType,
      search,
    ],
  );

  useEffect(() => {
    void (async () => {
      const [memberRes, buildingRes, bankRes, accountRes] = await Promise.all([
        window.sams.member.list(),
        window.sams.property.listBuildings(),
        window.sams.coa.searchForPicker('', 'BANK'),
        window.sams.coa.searchForPicker('', 'ACCOUNT'),
      ]);
      if (memberRes.success && memberRes.data) setMembers(memberRes.data.items);
      if (buildingRes.success && buildingRes.data) setBuildings(buildingRes.data);
      if (bankRes.success && bankRes.data) setBankAccounts(bankRes.data);
      if (accountRes.success && accountRes.data) setLedgerAccounts(accountRes.data);
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

  const handleDrillDown = (drillDown: ReportRowDrillDown): void => {
    if (drillDown.refType === 'BILL') {
      setDrillBillId(drillDown.refId);
      return;
    }
    if (drillDown.refType === 'VOUCHER') {
      setDrillVoucherId(drillDown.refId);
      return;
    }
    if (drillDown.refType === 'MEMBER') {
      const route = `/app/members/register?memberId=${drillDown.refId}`;
      openTab({ id: `mem-${drillDown.refId}`, title: 'Member Register', route });
      navigate(route);
      return;
    }
    if (drillDown.refType === 'GENERATED_LETTER') {
      void (async () => {
        const response = await window.sams.correspondence.getGeneratedLetter(drillDown.refId);
        if (!response.success || !response.data) return;
        setLetterPreviewHtml(response.data.renderedHtml);
        setLetterPreviewOpen(true);
      })();
    }
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

        {DATE_RANGE_REPORTS.has(reportId) && (
          <>
            <label>
              Date from
              <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </label>
            <label>
              Date to
              <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </label>
          </>
        )}

        {AS_ON_REPORTS.has(reportId) && (
          <label>
            As on date
            <input type="date" value={asOnDate} onChange={(event) => setAsOnDate(event.target.value)} />
          </label>
        )}

        {DAY_BOOK_REPORTS.has(reportId) && (
          <label>
            Date
            <input type="date" value={dayDate} onChange={(event) => setDayDate(event.target.value)} />
          </label>
        )}

        {BUILDING_FILTER_REPORTS.has(reportId) && (
          <>
            <label>
              Building
              <select value={buildingId} onChange={(event) => setBuildingId(event.target.value)}>
                <option value="">All buildings</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.shortName} — {building.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Wing ID
              <input value={wingId} onChange={(event) => setWingId(event.target.value)} />
            </label>
          </>
        )}

        {ACCOUNT_REPORTS.has(reportId) && (
          <label>
            Account
            <select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
              <option value="">Select account</option>
              {ledgerAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.particulars}
                </option>
              ))}
            </select>
          </label>
        )}

        {BANK_ACCOUNT_REPORTS.has(reportId) && (
          <label>
            Bank account
            <select value={bankAccountId} onChange={(event) => setBankAccountId(event.target.value)}>
              <option value="">Select bank account</option>
              {bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.particulars}
                </option>
              ))}
            </select>
          </label>
        )}

        {VOUCHER_TYPE_REPORTS.has(reportId) && (
          <label>
            Voucher type
            <select value={voucherType} onChange={(event) => setVoucherType(event.target.value)}>
              <option value="">All types</option>
              {Object.values(VoucherType).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
        )}

        {BANK_SLIP_REPORTS.has(reportId) && (
          <label>
            Bank Slip No.
            <input value={bankSlipNo} onChange={(event) => setBankSlipNo(event.target.value)} />
          </label>
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
                <tr
                  key={index}
                  className={row.drillDown ? 'drilldown-row' : undefined}
                  onClick={() => {
                    if (row.drillDown) handleDrillDown(row.drillDown);
                  }}
                  style={row.drillDown ? { cursor: 'pointer' } : undefined}
                >
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
          {result.metadata.supportsDrillDown && (
            <p className="muted">Click a row to open the underlying record.</p>
          )}
        </div>
      )}

      <PrintPreviewModal
        open={previewOpen}
        title={result?.title ?? 'Report Preview'}
        html={previewHtml ?? ''}
        onClose={() => setPreviewOpen(false)}
        onPrint={() => window.print()}
      />

      <BillReadonlyModal
        open={Boolean(drillBillId)}
        billId={drillBillId}
        onClose={() => setDrillBillId(null)}
      />

      <VoucherReadonlyModal
        open={Boolean(drillVoucherId)}
        voucherId={drillVoucherId}
        onClose={() => setDrillVoucherId(null)}
      />

      <PrintPreviewModal
        open={letterPreviewOpen}
        title="Reminder Letter"
        html={letterPreviewHtml ?? ''}
        onClose={() => setLetterPreviewOpen(false)}
        onPrint={() => window.print()}
      />
    </section>
  );
}
