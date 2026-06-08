import { useCallback, useEffect, useState } from 'react';
import type {
  IFormRegisterDto,
  IFormShareEntryDto,
  IFormShareTransferDto,
  MemberListItemDto,
} from '@sams/shared-types';
import { AuditIdentityModal, ConfirmDialog, MasterFormToolbar } from '../../components';
import { useFormState } from '../../hooks/useFormState';
import { getIpcErrorMessage } from '../../hooks/session';

const emptyIForm = (): IFormRegisterDto => ({
  id: '',
  financialYearId: '',
  srNo: 0,
  memberId: '',
  admissionDate: null,
  admissionFeeDate: null,
  fullName: '',
  unitNo: '',
  address: null,
  occupation: null,
  ageOnAdmission: null,
  nomineeName: null,
  nominationDate: null,
  cessationDate: null,
  cessationReason: null,
  remarks: null,
  shareEntries: [],
  shareTransfers: [],
  createdAt: '',
  createdBy: '',
  updatedAt: '',
  updatedBy: '',
});

const emptyShare = (iFormRegisterId: string): IFormShareEntryDto => ({
  id: '',
  iFormRegisterId,
  onDate: null,
  cashBookFolio: null,
  applicationDetails: null,
  amountCall1: null,
  amountCall2: null,
  totalAmount: null,
  numberOfShares: null,
  certificateSerialNo: null,
  createdAt: '',
  createdBy: '',
  updatedAt: '',
  updatedBy: '',
});

const emptyTransfer = (iFormRegisterId: string): IFormShareTransferDto => ({
  id: '',
  iFormRegisterId,
  onDate: null,
  cashBookFolio: null,
  unitNo: null,
  registerNo: null,
  serialNo: null,
  certificatesCount: null,
  sharesTransferred: null,
  balanceShares: null,
  balanceCertificateSerial: null,
  balanceAmount: null,
  createdAt: '',
  createdBy: '',
  updatedAt: '',
  updatedBy: '',
});

/** REG-004 — I-Form Membership Register (IF-001 to IF-003). */
export function IFormRegisterScreen(): React.ReactElement {
  const form = useFormState(emptyIForm());
  const [items, setItems] = useState<IFormRegisterDto[]>([]);
  const [members, setMembers] = useState<MemberListItemDto[]>([]);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState(false);
  const [shareForm, setShareForm] = useState<IFormShareEntryDto>(emptyShare(''));
  const [transferForm, setTransferForm] = useState<IFormShareTransferDto>(emptyTransfer(''));
  const [shareEditing, setShareEditing] = useState(false);
  const [transferEditing, setTransferEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadList = useCallback(async (): Promise<void> => {
    const response = await window.sams.registers.listIForm(filter || undefined);
    if (response.success && response.data) setItems(response.data);
  }, [filter]);

  useEffect(() => {
    void loadList();
    void window.sams.member.list({ status: 'all' }).then((response) => {
      if (response.success && response.data) setMembers(response.data.items);
    });
  }, [loadList]);

  const selectItem = (item: IFormRegisterDto): void => {
    form.commit(item);
    setShareForm(emptyShare(item.id));
    setTransferForm(emptyTransfer(item.id));
    setEditing(false);
    setShareEditing(false);
    setTransferEditing(false);
    setError(null);
  };

  const save = async (): Promise<void> => {
    setError(null);
    const response = await window.sams.registers.saveIForm(form.value);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    form.commit(response.data);
    setShareForm(emptyShare(response.data.id));
    setTransferForm(emptyTransfer(response.data.id));
    setEditing(false);
    setMessage('I-Form entry saved.');
    await loadList();
  };

  const saveShare = async (): Promise<void> => {
    if (!form.value.id) return;
    setError(null);
    const response = await window.sams.registers.saveIFormShare({
      ...shareForm,
      iFormRegisterId: form.value.id,
    });
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    const refreshed = await window.sams.registers.getIForm(form.value.id);
    if (refreshed.success && refreshed.data) {
      form.commit(refreshed.data);
      setShareForm(emptyShare(refreshed.data.id));
    }
    setShareEditing(false);
    setMessage('Share entry saved.');
  };

  const saveTransfer = async (): Promise<void> => {
    if (!form.value.id) return;
    setError(null);
    const response = await window.sams.registers.saveIFormTransfer({
      ...transferForm,
      iFormRegisterId: form.value.id,
    });
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    const refreshed = await window.sams.registers.getIForm(form.value.id);
    if (refreshed.success && refreshed.data) {
      form.commit(refreshed.data);
      setTransferForm(emptyTransfer(refreshed.data.id));
    }
    setTransferEditing(false);
    setMessage('Share transfer saved.');
  };

  const disabled = !editing;

  return (
    <section className="form-screen master-browse-screen">
      <h2>I-Form Membership Register</h2>
      <p className="muted">
        Statutory membership register. Header syncs from member data; share sub-tables are manual
        entry per IF-002/IF-003.
      </p>

      <MasterFormToolbar
        disabled={{ save: !editing || !form.dirty, cancel: !editing }}
        onAdd={() => {
          form.commit(emptyIForm());
          setEditing(true);
        }}
        onEdit={() => setEditing(true)}
        onSave={() => void save()}
        onCancel={() => {
          form.reset();
          setEditing(false);
        }}
        onDelete={form.value.id ? () => setConfirmDelete(true) : undefined}
        onBrowse={() => void loadList()}
        onUserIdentity={() => setAuditOpen(true)}
      />

      <div className="filter-row">
        <label>
          Search
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Name or unit" />
        </label>
        <button type="button" onClick={() => void loadList()}>
          Apply
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}

      <div className="master-browse-layout">
        <aside className="master-browse-list">
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => selectItem(item)}>
                  {item.srNo}. {item.fullName} — {item.unitNo}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="master-browse-form">
          <div className="form-grid">
            <label>
              Sr. No.
              <input disabled value={form.value.srNo || '(auto)'} readOnly />
            </label>
            <label>
              Member
              <select
                disabled={disabled || Boolean(form.value.id)}
                value={form.value.memberId}
                onChange={(e) => {
                  const member = members.find((m) => m.id === e.target.value);
                  form.patch({
                    memberId: e.target.value,
                    fullName: member?.memberName ?? '',
                    unitNo: member?.unitNo ?? '',
                  });
                }}
              >
                <option value="">Select member</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.memberName} ({m.unitNo})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Full Name
              <input
                disabled={disabled}
                value={form.value.fullName}
                onChange={(e) => form.patch({ fullName: e.target.value })}
              />
            </label>
            <label>
              Unit No.
              <input
                disabled={disabled}
                value={form.value.unitNo}
                onChange={(e) => form.patch({ unitNo: e.target.value })}
              />
            </label>
            <label>
              Admission Date
              <input
                type="date"
                disabled={disabled}
                value={form.value.admissionDate ?? ''}
                onChange={(e) => form.patch({ admissionDate: e.target.value || null })}
              />
            </label>
            <label>
              Admission Fee Date
              <input
                type="date"
                disabled={disabled}
                value={form.value.admissionFeeDate ?? ''}
                onChange={(e) => form.patch({ admissionFeeDate: e.target.value || null })}
              />
            </label>
            <label>
              Occupation
              <input
                disabled={disabled}
                value={form.value.occupation ?? ''}
                onChange={(e) => form.patch({ occupation: e.target.value || null })}
              />
            </label>
            <label>
              Age on Admission
              <input
                type="number"
                disabled={disabled}
                value={form.value.ageOnAdmission ?? ''}
                onChange={(e) =>
                  form.patch({ ageOnAdmission: e.target.value ? Number(e.target.value) : null })
                }
              />
            </label>
            <label>
              Nominee Name
              <input
                disabled={disabled}
                value={form.value.nomineeName ?? ''}
                onChange={(e) => form.patch({ nomineeName: e.target.value || null })}
              />
            </label>
            <label>
              Nomination Date
              <input
                type="date"
                disabled={disabled}
                value={form.value.nominationDate ?? ''}
                onChange={(e) => form.patch({ nominationDate: e.target.value || null })}
              />
            </label>
            <label>
              Cessation Date
              <input disabled value={form.value.cessationDate ?? ''} readOnly />
            </label>
            <label>
              Cessation Reason
              <input disabled value={form.value.cessationReason ?? ''} readOnly />
            </label>
            <label className="full-width">
              Address
              <textarea
                disabled={disabled}
                value={form.value.address ?? ''}
                onChange={(e) => form.patch({ address: e.target.value || null })}
              />
            </label>
            <label className="full-width">
              Remarks
              <textarea
                disabled={disabled}
                value={form.value.remarks ?? ''}
                onChange={(e) => form.patch({ remarks: e.target.value || null })}
              />
            </label>
          </div>

          {form.value.id && (
            <>
              <section className="sub-panel">
                <h3>Share Details (IF-002)</h3>
                <div className="form-grid">
                  <label>
                    On Date
                    <input
                      type="date"
                      disabled={!shareEditing}
                      value={shareForm.onDate ?? ''}
                      onChange={(e) => setShareForm({ ...shareForm, onDate: e.target.value || null })}
                    />
                  </label>
                  <label>
                    Cash Book Folio
                    <input
                      disabled={!shareEditing}
                      value={shareForm.cashBookFolio ?? ''}
                      onChange={(e) =>
                        setShareForm({ ...shareForm, cashBookFolio: e.target.value || null })
                      }
                    />
                  </label>
                  <label>
                    I Call Amount
                    <input
                      type="number"
                      disabled={!shareEditing}
                      value={shareForm.amountCall1 ?? ''}
                      onChange={(e) =>
                        setShareForm({
                          ...shareForm,
                          amountCall1: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </label>
                  <label>
                    II Call Amount
                    <input
                      type="number"
                      disabled={!shareEditing}
                      value={shareForm.amountCall2 ?? ''}
                      onChange={(e) =>
                        setShareForm({
                          ...shareForm,
                          amountCall2: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </label>
                  <label>
                    Total Amount
                    <input
                      type="number"
                      disabled={!shareEditing}
                      value={shareForm.totalAmount ?? ''}
                      onChange={(e) =>
                        setShareForm({
                          ...shareForm,
                          totalAmount: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </label>
                  <label>
                    No. of Shares
                    <input
                      type="number"
                      disabled={!shareEditing}
                      value={shareForm.numberOfShares ?? ''}
                      onChange={(e) =>
                        setShareForm({
                          ...shareForm,
                          numberOfShares: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </label>
                  <label>
                    Certificate Serial No.
                    <input
                      disabled={!shareEditing}
                      value={shareForm.certificateSerialNo ?? ''}
                      onChange={(e) =>
                        setShareForm({
                          ...shareForm,
                          certificateSerialNo: e.target.value || null,
                        })
                      }
                    />
                  </label>
                  <label className="full-width">
                    Application Details
                    <textarea
                      disabled={!shareEditing}
                      value={shareForm.applicationDetails ?? ''}
                      onChange={(e) =>
                        setShareForm({
                          ...shareForm,
                          applicationDetails: e.target.value || null,
                        })
                      }
                    />
                  </label>
                </div>
                <div className="button-row">
                  <button
                    type="button"
                    onClick={() => {
                      setShareForm(emptyShare(form.value.id));
                      setShareEditing(true);
                    }}
                  >
                    Add Share Row
                  </button>
                  {shareEditing && (
                    <button type="button" onClick={() => void saveShare()}>
                      Save Share Row
                    </button>
                  )}
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Folio</th>
                      <th>Shares</th>
                      <th>Total</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.value.shareEntries.map((row) => (
                      <tr key={row.id}>
                        <td>{row.onDate ?? ''}</td>
                        <td>{row.cashBookFolio ?? ''}</td>
                        <td>{row.numberOfShares ?? ''}</td>
                        <td>{row.totalAmount ?? ''}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => {
                              setShareForm(row);
                              setShareEditing(true);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await window.sams.registers.deleteIFormShare(row.id);
                              const refreshed = await window.sams.registers.getIForm(form.value.id);
                              if (refreshed.success && refreshed.data) form.commit(refreshed.data);
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section className="sub-panel">
                <h3>Share Transfer / Surrender (IF-003)</h3>
                <div className="form-grid">
                  <label>
                    On Date
                    <input
                      type="date"
                      disabled={!transferEditing}
                      value={transferForm.onDate ?? ''}
                      onChange={(e) =>
                        setTransferForm({ ...transferForm, onDate: e.target.value || null })
                      }
                    />
                  </label>
                  <label>
                    Cash Book Folio
                    <input
                      disabled={!transferEditing}
                      value={transferForm.cashBookFolio ?? ''}
                      onChange={(e) =>
                        setTransferForm({ ...transferForm, cashBookFolio: e.target.value || null })
                      }
                    />
                  </label>
                  <label>
                    Unit No.
                    <input
                      disabled={!transferEditing}
                      value={transferForm.unitNo ?? ''}
                      onChange={(e) =>
                        setTransferForm({ ...transferForm, unitNo: e.target.value || null })
                      }
                    />
                  </label>
                  <label>
                    Register No.
                    <input
                      disabled={!transferEditing}
                      value={transferForm.registerNo ?? ''}
                      onChange={(e) =>
                        setTransferForm({ ...transferForm, registerNo: e.target.value || null })
                      }
                    />
                  </label>
                  <label>
                    Serial No.
                    <input
                      disabled={!transferEditing}
                      value={transferForm.serialNo ?? ''}
                      onChange={(e) =>
                        setTransferForm({ ...transferForm, serialNo: e.target.value || null })
                      }
                    />
                  </label>
                  <label>
                    Certificates
                    <input
                      type="number"
                      disabled={!transferEditing}
                      value={transferForm.certificatesCount ?? ''}
                      onChange={(e) =>
                        setTransferForm({
                          ...transferForm,
                          certificatesCount: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </label>
                  <label>
                    Shares Transferred
                    <input
                      type="number"
                      disabled={!transferEditing}
                      value={transferForm.sharesTransferred ?? ''}
                      onChange={(e) =>
                        setTransferForm({
                          ...transferForm,
                          sharesTransferred: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </label>
                  <label>
                    Balance Shares
                    <input
                      type="number"
                      disabled={!transferEditing}
                      value={transferForm.balanceShares ?? ''}
                      onChange={(e) =>
                        setTransferForm({
                          ...transferForm,
                          balanceShares: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </label>
                  <label>
                    Balance Certificate Serial
                    <input
                      disabled={!transferEditing}
                      value={transferForm.balanceCertificateSerial ?? ''}
                      onChange={(e) =>
                        setTransferForm({
                          ...transferForm,
                          balanceCertificateSerial: e.target.value || null,
                        })
                      }
                    />
                  </label>
                  <label>
                    Balance Amount
                    <input
                      type="number"
                      disabled={!transferEditing}
                      value={transferForm.balanceAmount ?? ''}
                      onChange={(e) =>
                        setTransferForm({
                          ...transferForm,
                          balanceAmount: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </label>
                </div>
                <div className="button-row">
                  <button
                    type="button"
                    onClick={() => {
                      setTransferForm(emptyTransfer(form.value.id));
                      setTransferEditing(true);
                    }}
                  >
                    Add Transfer Row
                  </button>
                  {transferEditing && (
                    <button type="button" onClick={() => void saveTransfer()}>
                      Save Transfer Row
                    </button>
                  )}
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Unit</th>
                      <th>Transferred</th>
                      <th>Balance</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.value.shareTransfers.map((row) => (
                      <tr key={row.id}>
                        <td>{row.onDate ?? ''}</td>
                        <td>{row.unitNo ?? ''}</td>
                        <td>{row.sharesTransferred ?? ''}</td>
                        <td>{row.balanceShares ?? ''}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => {
                              setTransferForm(row);
                              setTransferEditing(true);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await window.sams.registers.deleteIFormTransfer(row.id);
                              const refreshed = await window.sams.registers.getIForm(form.value.id);
                              if (refreshed.success && refreshed.data) form.commit(refreshed.data);
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </>
          )}
        </div>
      </div>

      <AuditIdentityModal
        open={auditOpen}
        audit={form.value.id ? form.value : null}
        onClose={() => setAuditOpen(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete I-Form entry?"
        message="This will also delete all share and transfer sub-rows."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false);
          const response = await window.sams.registers.deleteIForm(form.value.id);
          if (!response.success) {
            setError(getIpcErrorMessage(response.error));
            return;
          }
          form.commit(emptyIForm());
          setMessage('I-Form entry deleted.');
          await loadList();
        }}
      />
    </section>
  );
}
