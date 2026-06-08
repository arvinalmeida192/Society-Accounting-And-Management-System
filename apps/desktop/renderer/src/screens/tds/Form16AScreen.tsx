import { useCallback, useEffect, useState } from 'react';
import { PartyType, type AddressBookEntryDto } from '@sams/shared-types';
import { getIpcErrorMessage } from '../../hooks/session';

/** TDS-003 — Form 16A generation with address validation (GAP-020–022). */
export function Form16AScreen(): React.ReactElement {
  const [allEntries, setAllEntries] = useState<AddressBookEntryDto[]>([]);
  const [partyAccountId, setPartyAccountId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [resultPath, setResultPath] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const loadParties = useCallback(async (): Promise<void> => {
    const response = await window.sams.masters.listAddressBook();
    if (response.success && response.data) {
      setAllEntries(response.data);
      const eligible = response.data.filter(
        (row) =>
          row.partyType !== PartyType.SOCIETY_BANK &&
          (row.officeAddress || row.otherAddress),
      );
      if (!partyAccountId && eligible[0]) {
        setPartyAccountId(eligible[0].accountMasterId);
      }
    }
  }, [partyAccountId]);

  useEffect(() => {
    void loadParties();
  }, [loadParties]);

  const generate = async (): Promise<void> => {
    if (!partyAccountId) {
      setError('Select a party with a complete Address Book entry.');
      return;
    }
    setGenerating(true);
    setError(null);
    setMessage(null);
    setResultPath(null);
    const response = await window.sams.tds.generateForm16A({ partyAccountId });
    setGenerating(false);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    if (response.data.blocked) {
      setError(response.data.reason ?? 'Form 16A generation blocked.');
      return;
    }
    setMessage(
      `Form 16A generated for ${response.data.partyName} (${response.data.financialYearLabel}). ` +
        `${response.data.groupCount} summary groups, total deductions ₹${response.data.totalDeductions?.toFixed(2)}.`,
    );
    setResultPath(response.data.htmlPath ?? null);
  };

  const eligibleParties = allEntries.filter(
    (row) =>
      row.partyType !== PartyType.SOCIETY_BANK && (row.officeAddress || row.otherAddress),
  );
  const missingAddressCount = allEntries.filter(
    (row) =>
      row.partyType !== PartyType.SOCIETY_BANK && !row.officeAddress && !row.otherAddress,
  ).length;

  return (
    <section className="form-screen">
      <h2>Form 16A Generation</h2>
      <p className="muted">
        Generates a Form 16A certificate grouped by nature of payment, quarter, and challan (GAP-022).
        Blocked when the party has no Address Book address (GAP-020). Uses society bank from Address
        Book SOCIETY_BANK entry for deposit reference (GAP-021).
      </p>

      <div className="form-grid">
        <label>
          Party (deductee) *
          <select
            value={partyAccountId}
            onChange={(event) => setPartyAccountId(event.target.value)}
          >
            <option value="">Select party…</option>
            {eligibleParties.map((party) => (
              <option key={party.accountMasterId} value={party.accountMasterId}>
                {party.accountParticulars} ({party.partyType})
              </option>
            ))}
          </select>
        </label>
      </div>

      {eligibleParties.length === 0 && (
        <p className="error-text">
          No parties with complete addresses found. Add office or other address in Address Book before
          generating Form 16A.
          {missingAddressCount > 0 && ` ${missingAddressCount} party record(s) lack address.`}
        </p>
      )}

      <div className="form-actions">
        <button type="button" disabled={generating || !partyAccountId} onClick={() => void generate()}>
          {generating ? 'Generating…' : 'Generate Form 16A'}
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="success-text">{message}</p>}
      {resultPath && (
        <p className="muted">
          Saved to: <code>{resultPath}</code>
        </p>
      )}
    </section>
  );
}
