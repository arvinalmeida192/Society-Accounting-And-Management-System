import { useCallback, useEffect, useState } from 'react';
import type { MemberListItemDto, PropertyRegisterEntryDto } from '@sams/shared-types';
import { AuditIdentityModal, ConfirmDialog, MasterFormToolbar } from '../../components';
import { useFormState } from '../../hooks/useFormState';
import { getIpcErrorMessage } from '../../hooks/session';

const emptyEntry = (): PropertyRegisterEntryDto => ({
  id: '',
  financialYearId: '',
  srNo: 0,
  coPartnerMemberId: null,
  coPartnerMemberName: null,
  possessionDate: null,
  tenementNo: null,
  flatNo: '',
  floorNo: null,
  description: null,
  area: null,
  cost: null,
  landValue: null,
  constructionValue: null,
  annualGroundRent: null,
  cessationDate: null,
  remark: null,
  createdAt: '',
  createdBy: '',
  updatedAt: '',
  updatedBy: '',
});

/** REG-002 — Property Register (SRS 3.10.2). */
export function PropertyRegisterScreen(): React.ReactElement {
  const form = useFormState(emptyEntry());
  const [items, setItems] = useState<PropertyRegisterEntryDto[]>([]);
  const [members, setMembers] = useState<MemberListItemDto[]>([]);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadList = useCallback(async (): Promise<void> => {
    const response = await window.sams.registers.listProperty(filter || undefined);
    if (response.success && response.data) setItems(response.data);
  }, [filter]);

  useEffect(() => {
    void loadList();
    void window.sams.member.list({ status: 'active' }).then((response) => {
      if (response.success && response.data) setMembers(response.data.items);
    });
  }, [loadList]);

  const selectItem = (item: PropertyRegisterEntryDto): void => {
    form.commit(item);
    setEditing(false);
    setError(null);
  };

  const save = async (): Promise<void> => {
    setError(null);
    const response = await window.sams.registers.saveProperty(form.value);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    form.commit(response.data);
    setEditing(false);
    setMessage('Property register entry saved.');
    await loadList();
  };

  const onMemberSelect = (memberId: string): void => {
    const member = members.find((m) => m.id === memberId);
    form.patch({
      coPartnerMemberId: memberId || null,
      coPartnerMemberName: member?.memberName ?? null,
    });
  };

  const disabled = !editing;

  return (
    <section className="form-screen master-browse-screen">
      <h2>Property Register</h2>
      <p className="muted">Statutory property register with auto-incremented serial numbers.</p>

      <MasterFormToolbar
        disabled={{ save: !editing || !form.dirty, cancel: !editing }}
        onAdd={() => {
          form.commit(emptyEntry());
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
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Flat, tenement, co-partner" />
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
                  {item.srNo}. {item.flatNo}
                  {item.coPartnerMemberName ? ` — ${item.coPartnerMemberName}` : ''}
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
              Co-Partner (Member)
              <select
                disabled={disabled}
                value={form.value.coPartnerMemberId ?? ''}
                onChange={(e) => onMemberSelect(e.target.value)}
              >
                <option value="">— None —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.memberName} ({m.unitNo})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Co-Partner Name
              <input
                disabled={disabled}
                value={form.value.coPartnerMemberName ?? ''}
                onChange={(e) => form.patch({ coPartnerMemberName: e.target.value || null })}
              />
            </label>
            <label>
              Possession Date
              <input
                type="date"
                disabled={disabled}
                value={form.value.possessionDate ?? ''}
                onChange={(e) => form.patch({ possessionDate: e.target.value || null })}
              />
            </label>
            <label>
              Tenement No.
              <input
                disabled={disabled}
                value={form.value.tenementNo ?? ''}
                onChange={(e) => form.patch({ tenementNo: e.target.value || null })}
              />
            </label>
            <label>
              Flat No.
              <input
                disabled={disabled}
                value={form.value.flatNo}
                onChange={(e) => form.patch({ flatNo: e.target.value })}
              />
            </label>
            <label>
              Floor No.
              <input
                disabled={disabled}
                value={form.value.floorNo ?? ''}
                onChange={(e) => form.patch({ floorNo: e.target.value || null })}
              />
            </label>
            <label>
              Area (sq. ft.)
              <input
                type="number"
                disabled={disabled}
                value={form.value.area ?? ''}
                onChange={(e) => form.patch({ area: e.target.value ? Number(e.target.value) : null })}
              />
            </label>
            <label>
              Cost
              <input
                type="number"
                disabled={disabled}
                value={form.value.cost ?? ''}
                onChange={(e) => form.patch({ cost: e.target.value ? Number(e.target.value) : null })}
              />
            </label>
            <label>
              Land Value
              <input
                type="number"
                disabled={disabled}
                value={form.value.landValue ?? ''}
                onChange={(e) => form.patch({ landValue: e.target.value ? Number(e.target.value) : null })}
              />
            </label>
            <label>
              Construction Value
              <input
                type="number"
                disabled={disabled}
                value={form.value.constructionValue ?? ''}
                onChange={(e) =>
                  form.patch({ constructionValue: e.target.value ? Number(e.target.value) : null })
                }
              />
            </label>
            <label>
              Annual Ground Rent
              <input
                type="number"
                disabled={disabled}
                value={form.value.annualGroundRent ?? ''}
                onChange={(e) =>
                  form.patch({ annualGroundRent: e.target.value ? Number(e.target.value) : null })
                }
              />
            </label>
            <label>
              Cessation Date
              <input
                type="date"
                disabled={disabled}
                value={form.value.cessationDate ?? ''}
                onChange={(e) => form.patch({ cessationDate: e.target.value || null })}
              />
            </label>
            <label className="full-width">
              Description
              <textarea
                disabled={disabled}
                value={form.value.description ?? ''}
                onChange={(e) => form.patch({ description: e.target.value || null })}
              />
            </label>
            <label className="full-width">
              Remark
              <textarea
                disabled={disabled}
                value={form.value.remark ?? ''}
                onChange={(e) => form.patch({ remark: e.target.value || null })}
              />
            </label>
          </div>
        </div>
      </div>

      <AuditIdentityModal
        open={auditOpen}
        audit={form.value.id ? form.value : null}
        onClose={() => setAuditOpen(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete property register entry?"
        message="This action cannot be undone."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false);
          const response = await window.sams.registers.deleteProperty(form.value.id);
          if (!response.success) {
            setError(getIpcErrorMessage(response.error));
            return;
          }
          form.commit(emptyEntry());
          setMessage('Entry deleted.');
          await loadList();
        }}
      />
    </section>
  );
}
