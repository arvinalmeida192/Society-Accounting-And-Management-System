import { useState } from 'react';
import { OpeningBalanceType, type MemberOpeningBalanceDto } from '@sams/shared-types';
import { MoneyInput } from './MoneyInput';
import { ConfirmDialog } from './ConfirmDialog';
import { getIpcErrorMessage } from '../hooks/session';

export interface OpeningBalanceModalProps {
  open: boolean;
  memberId: string;
  memberName: string;
  existing: MemberOpeningBalanceDto[];
  onClose: () => void;
  onSaved: () => void;
}

export function OpeningBalanceModal({
  open,
  memberId,
  memberName,
  existing,
  onClose,
  onSaved,
}: OpeningBalanceModalProps): React.ReactElement | null {
  const [balanceType, setBalanceType] = useState<OpeningBalanceType>(OpeningBalanceType.REGULAR);
  const [principalOB, setPrincipalOB] = useState(0);
  const [interestOB, setInterestOB] = useState(0);
  const [serviceTaxOB, setServiceTaxOB] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reconciliationWarning, setReconciliationWarning] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const existingPartition = existing.find((row) => row.balanceType === balanceType);
  const alreadyPosted = Boolean(existingPartition?.ledgerVoucherId);

  const save = async (acknowledgeReconciliation = false): Promise<void> => {
    setError(null);
    setBusy(true);
    try {
      const response = await window.sams.member.saveOpeningBalance({
        memberId,
        balanceType,
        principalOB,
        interestOB,
        serviceTaxOB: balanceType === OpeningBalanceType.REGULAR ? serviceTaxOB : 0,
        acknowledgeReconciliation,
      });
      if (!response.success || !response.data) {
        setError(getIpcErrorMessage(response.error));
        return;
      }
      if (response.data.reconciliationWarning && !response.data.ledgerVoucherId) {
        setReconciliationWarning(response.data.reconciliationWarning);
        return;
      }
      setReconciliationWarning(null);
      onSaved();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <header>
          <h3>Opening Balance — {memberName}</h3>
        </header>

        <div className="form-grid">
          <label>
            Partition
            <select
              value={balanceType}
              disabled={busy || alreadyPosted}
              onChange={(event) => setBalanceType(event.target.value as OpeningBalanceType)}
            >
              <option value={OpeningBalanceType.REGULAR}>Regular</option>
              <option value={OpeningBalanceType.SUPPLEMENTARY}>Supplementary</option>
            </select>
          </label>
          <MoneyInput
            label="Principal OB"
            disabled={busy || alreadyPosted}
            value={principalOB}
            onChange={setPrincipalOB}
          />
          <MoneyInput
            label="Interest OB"
            disabled={busy || alreadyPosted}
            value={interestOB}
            onChange={setInterestOB}
          />
          {balanceType === OpeningBalanceType.REGULAR && (
            <MoneyInput
              label="Service Tax OB"
              disabled={busy || alreadyPosted}
              value={serviceTaxOB}
              onChange={setServiceTaxOB}
            />
          )}
        </div>

        {alreadyPosted && (
          <p className="muted">
            This partition was already posted (voucher {existingPartition?.ledgerVoucherId?.slice(0, 8)}…).
          </p>
        )}
        {error && <p className="form-error">{error}</p>}

        <div className="drawer-actions">
          <button type="button" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || alreadyPosted}
            onClick={() => void save()}
          >
            Post Opening Balance
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(reconciliationWarning)}
        title="Reconciliation warning"
        message={reconciliationWarning ?? ''}
        confirmLabel="Post anyway"
        onCancel={() => setReconciliationWarning(null)}
        onConfirm={() => void save(true)}
      />
    </div>
  );
}
