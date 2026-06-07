import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BankRecStatus,
  type AccountPickerItem,
  type BankRecGridRow,
  type BankReconciliationStatementDto,
} from '@sams/shared-types';
import {
  AccountPickerModal,
  MasterFormToolbar,
  PrintPreviewModal,
  VoucherReadonlyModal,
} from '../../components';
import { getIpcErrorMessage } from '../../hooks/session';

type GridRow = BankRecGridRow & { pendingClearingDate?: string | null; selected?: boolean };

/** BNK-001 — bank reconciliation clearing entry (BR-001–006). */
export function BankReconciliationScreen(): React.ReactElement {
  const [bankAccountId, setBankAccountId] = useState('');
  const [bankAccountLabel, setBankAccountLabel] = useState('');
  const [dateFrom, setDateFrom] = useState(`${new Date().getFullYear()}-04-01`);
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [asOnDate, setAsOnDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<BankRecStatus>(BankRecStatus.UNCLEARED);
  const [toolbarClearingDate, setToolbarClearingDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<GridRow[]>([]);
  const [statement, setStatement] = useState<BankReconciliationStatementDto | null>(null);
  const [statementHtml, setStatementHtml] = useState('');
  const [statementOpen, setStatementOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [drillDownVoucherId, setDrillDownVoucherId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedLineIds = useMemo(
    () => rows.filter((row) => row.selected).map((row) => row.voucherLineId),
    [rows],
  );

  const loadItems = useCallback(async (): Promise<void> => {
    if (!bankAccountId) return;
    setError(null);
    const response = await window.sams.bankrec.listItems({
      bankAccountId,
      dateFrom,
      dateTo,
      status,
    });
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setRows(response.data.map((row) => ({ ...row, selected: false })));
    setMessage(`Loaded ${response.data.length} item(s).`);
  }, [bankAccountId, dateFrom, dateTo, status]);

  useEffect(() => {
    void (async () => {
      const response = await window.sams.coa.searchForPicker('', 'BANK');
      if (response.success && response.data?.[0] && !bankAccountId) {
        setBankAccountId(response.data[0].id);
        setBankAccountLabel(response.data[0].label);
      }
    })();
  }, [bankAccountId]);

  const selectBankAccount = (account: AccountPickerItem): void => {
    setBankAccountId(account.id);
    setBankAccountLabel(account.label);
    setPickerOpen(false);
  };

  const propagateClearingDate = (): void => {
    setRows((current) =>
      current.map((row) =>
        row.selected
          ? { ...row, pendingClearingDate: toolbarClearingDate, clearedOnDate: toolbarClearingDate }
          : row,
      ),
    );
    setMessage('Clearing date propagated to selected visible rows.');
  };

  const saveClearingDates = async (): Promise<void> => {
    const updates = rows.filter((row) => row.pendingClearingDate);
    if (!updates.length) {
      setError('No pending clearing dates to save.');
      return;
    }
    setError(null);
    const response = await window.sams.bankrec.bulkSetClearingDate({
      voucherLineIds: updates.map((row) => row.voucherLineId),
      clearingDate: toolbarClearingDate,
    });
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setMessage(`Updated clearing date on ${response.data.updated} cheque(s).`);
    await loadItems();
  };

  const loadStatement = async (): Promise<void> => {
    if (!bankAccountId) return;
    setError(null);
    const response = await window.sams.bankrec.getStatement({ bankAccountId, asOnDate });
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setStatement(response.data);
    setStatementHtml(renderStatementHtml(response.data));
    setStatementOpen(true);
  };

  return (
    <section className="form-screen master-browse-screen">
      <h2>Bank Reconciliation — Clearing Entry</h2>

      <MasterFormToolbar
        onBrowse={() => void loadItems()}
        onSave={() => void saveClearingDates()}
        onPrint={() => void loadStatement()}
      />

      <div className="form-grid">
        <label>
          Bank Account *
          <button type="button" onClick={() => setPickerOpen(true)}>
            {bankAccountLabel || 'Select bank account…'}
          </button>
        </label>
        <label>
          Date From
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        </label>
        <label>
          Date To
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </label>
        <label>
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as BankRecStatus)}
          >
            <option value={BankRecStatus.UNCLEARED}>Uncleared</option>
            <option value={BankRecStatus.CLEARED}>Cleared</option>
            <option value={BankRecStatus.ALL}>All</option>
          </select>
        </label>
        <label>
          Bulk Clearing Date (BR-003)
          <input
            type="date"
            value={toolbarClearingDate}
            onChange={(event) => setToolbarClearingDate(event.target.value)}
          />
        </label>
        <label>
          Statement As-on Date
          <input type="date" value={asOnDate} onChange={(event) => setAsOnDate(event.target.value)} />
        </label>
      </div>

      <div className="form-actions">
        <button type="button" onClick={() => void loadItems()}>
          Refresh Grid
        </button>
        <button type="button" onClick={propagateClearingDate} disabled={!selectedLineIds.length}>
          Propagate Clearing Date to Selected
        </button>
      </div>

      <table className="data-grid">
        <thead>
          <tr>
            <th />
            <th>Voucher No.</th>
            <th>Date</th>
            <th>Cheque No.</th>
            <th>Cheque Date</th>
            <th
              title="Double-click to propagate toolbar clearing date to selected rows"
              onDoubleClick={propagateClearingDate}
            >
              Cleared Date
            </th>
            <th>Deposits</th>
            <th>Withdrawals</th>
            <th>Remark</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.voucherLineId}
              onDoubleClick={() => setDrillDownVoucherId(row.voucherId)}
              title="Double-click to open voucher (BR-006)"
            >
              <td>
                <input
                  type="checkbox"
                  checked={Boolean(row.selected)}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((item) =>
                        item.voucherLineId === row.voucherLineId
                          ? { ...item, selected: event.target.checked }
                          : item,
                      ),
                    )
                  }
                />
              </td>
              <td>{row.voucherNo}</td>
              <td>{row.voucherDate}</td>
              <td>{row.chequeNo ?? '—'}</td>
              <td>{row.chequeDate ?? '—'}</td>
              <td>{row.clearedOnDate ?? row.pendingClearingDate ?? '—'}</td>
              <td>{row.deposits > 0 ? row.deposits.toFixed(2) : '—'}</td>
              <td>{row.withdrawals > 0 ? row.withdrawals.toFixed(2) : '—'}</td>
              <td>{row.remark ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {statement && (
        <section className="statement-summary">
          <h4>Latest Statement Summary</h4>
          <p>Closing per books: ₹{statement.closingBalancePerBooks.toFixed(2)}</p>
          <p>Uncleared deposits: ₹{statement.addUnclearedDeposits.toFixed(2)}</p>
          <p>Uncleared withdrawals: ₹{statement.lessUnclearedWithdrawals.toFixed(2)}</p>
          <p>Closing per pass book: ₹{statement.closingBalancePerPassBook.toFixed(2)}</p>
        </section>
      )}

      {error && <p className="error-text">{error}</p>}
      {message && <p className="success-text">{message}</p>}

      <AccountPickerModal
        open={pickerOpen}
        kind="BANK"
        title="Select bank account"
        onSelect={selectBankAccount}
        onClose={() => setPickerOpen(false)}
      />

      <VoucherReadonlyModal
        open={Boolean(drillDownVoucherId)}
        voucherId={drillDownVoucherId}
        onClose={() => setDrillDownVoucherId(null)}
      />

      <PrintPreviewModal
        open={statementOpen}
        title="Bank Reconciliation Statement"
        html={statementHtml}
        onClose={() => setStatementOpen(false)}
        onPrint={() => window.print()}
      />
    </section>
  );
}

function renderStatementHtml(statement: BankReconciliationStatementDto): string {
  return `
    <div class="bank-rec-statement">
      <h2>Bank Reconciliation Statement</h2>
      <p><strong>Bank:</strong> ${statement.bankAccountName}</p>
      <p><strong>As on:</strong> ${statement.asOnDate}</p>
      <table>
        <tr><td>Opening balance per books</td><td>${statement.openingBalancePerBooks.toFixed(2)}</td></tr>
        <tr><td>Closing balance per books</td><td>${statement.closingBalancePerBooks.toFixed(2)}</td></tr>
        <tr><td>Add: uncleared deposits</td><td>${statement.addUnclearedDeposits.toFixed(2)}</td></tr>
        <tr><td>Less: uncleared withdrawals</td><td>${statement.lessUnclearedWithdrawals.toFixed(2)}</td></tr>
        <tr><td><strong>Closing balance per pass book</strong></td><td><strong>${statement.closingBalancePerPassBook.toFixed(2)}</strong></td></tr>
      </table>
    </div>
  `.trim();
}
