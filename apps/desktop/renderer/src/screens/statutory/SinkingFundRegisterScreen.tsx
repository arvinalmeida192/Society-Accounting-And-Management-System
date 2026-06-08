import { useCallback, useEffect, useState } from 'react';
import type { MemberListItemDto, SinkingFundEntryDto } from '@sams/shared-types';

/** REG-003 — Sinking Fund Register (SF-001, read-only auto-populated). */
export function SinkingFundRegisterScreen(): React.ReactElement {
  const [items, setItems] = useState<SinkingFundEntryDto[]>([]);
  const [members, setMembers] = useState<MemberListItemDto[]>([]);
  const [memberId, setMemberId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async (): Promise<void> => {
    const response = await window.sams.registers.listSinkingFund({
      memberId: memberId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
    if (!response.success) {
      setError(response.error?.message ?? 'Failed to load sinking fund entries.');
      return;
    }
    setItems(response.data ?? []);
    setError(null);
  }, [memberId, dateFrom, dateTo]);

  useEffect(() => {
    void loadList();
    void window.sams.member.list({ status: 'active' }).then((response) => {
      if (response.success && response.data) setMembers(response.data.items);
    });
  }, [loadList]);

  const totalContributed = items.reduce((sum, row) => sum + row.amountContributed, 0);

  return (
    <section className="form-screen">
      <h2>Sinking Fund Register</h2>
      <p className="muted">
        Read-only register auto-populated when member receipts include Sinking Fund (SINK) charge
        lines. Required contribution = 0.25% of flat construction value per SF-002.
      </p>

      <div className="filter-row">
        <label>
          Member
          <select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <option value="">All members</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.memberName} ({m.unitNo})
              </option>
            ))}
          </select>
        </label>
        <label>
          From
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        <button type="button" onClick={() => void loadList()}>
          Refresh
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      <table className="data-table">
        <thead>
          <tr>
            <th>Sr.</th>
            <th>Member</th>
            <th>Flat No.</th>
            <th>Flat Value (excl. land)</th>
            <th>Required @ 0.25%</th>
            <th>Receipt Date</th>
            <th>Amount Contributed</th>
            <th>Voucher</th>
            <th>Remark</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id}>
              <td>{row.srNo}</td>
              <td>{row.memberName ?? row.memberId}</td>
              <td>{row.flatNo}</td>
              <td>{row.flatValueExclLand.toFixed(2)}</td>
              <td>{row.requiredContribution.toFixed(2)}</td>
              <td>{row.receiptDate}</td>
              <td>{row.amountContributed.toFixed(2)}</td>
              <td>{row.sourceVoucherNo ?? row.sourceVoucherId}</td>
              <td>{row.remark ?? ''}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={9} className="muted">
                No sinking fund entries yet. Post a member receipt with a SINK account line to
                auto-create entries.
              </td>
            </tr>
          )}
        </tbody>
        {items.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={6} style={{ textAlign: 'right' }}>
                <strong>Total Contributed</strong>
              </td>
              <td>
                <strong>{totalContributed.toFixed(2)}</strong>
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        )}
      </table>
    </section>
  );
}
