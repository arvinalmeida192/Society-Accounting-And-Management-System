import { useCallback, useEffect, useState } from 'react';
import {
  CommitteeStatus,
  type CommitteeMemberDto,
  type MemberListItemDto,
} from '@sams/shared-types';
import { AuditIdentityModal, ConfirmDialog, MasterFormToolbar } from '../../components';
import { useFormState } from '../../hooks/useFormState';
import { getIpcErrorMessage } from '../../hooks/session';

const emptyCommitteeMember = (): CommitteeMemberDto => ({
  id: '',
  financialYearId: '',
  effectiveDate: new Date().toISOString().slice(0, 10),
  termEndsOn: null,
  buildingId: null,
  wingId: null,
  unitId: null,
  memberId: '',
  memberName: '',
  buildingName: null,
  wingName: null,
  unitNo: null,
  designation: '',
  status: CommitteeStatus.ACTIVE,
  createdAt: '',
  createdBy: '',
  updatedAt: '',
  updatedBy: '',
});

/** COR-003 — Committee Members with term history. */
export function CommitteeMembersScreen(): React.ReactElement {
  const form = useFormState(emptyCommitteeMember());
  const [items, setItems] = useState<CommitteeMemberDto[]>([]);
  const [members, setMembers] = useState<MemberListItemDto[]>([]);
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadList = useCallback(async (): Promise<void> => {
    const response = await window.sams.correspondence.listCommittee({
      activeOnly: showActiveOnly,
    });
    if (response.success && response.data) setItems(response.data);
  }, [showActiveOnly]);

  const loadMembers = useCallback(async (): Promise<void> => {
    const response = await window.sams.member.list();
    if (response.success && response.data) setMembers(response.data.items);
  }, []);

  useEffect(() => {
    void loadList();
    void loadMembers();
  }, [loadList, loadMembers]);

  const selectItem = (item: CommitteeMemberDto): void => {
    form.commit(item);
    setEditing(false);
    setError(null);
  };

  const save = async (): Promise<void> => {
    setError(null);
    const response = await window.sams.correspondence.saveCommittee(form.value);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    form.commit(response.data);
    setEditing(false);
    setMessage('Committee member saved.');
    await loadList();
  };

  return (
    <section className="form-screen master-browse-screen">
      <h2>Committee Members</h2>
      <p className="muted">Term-based committee records; history is preserved across terms.</p>

      <MasterFormToolbar
        disabled={{ save: !editing || !form.dirty, cancel: !editing }}
        onAdd={() => {
          form.commit(emptyCommitteeMember());
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

      <label>
        <input
          type="checkbox"
          checked={showActiveOnly}
          onChange={(event) => setShowActiveOnly(event.target.checked)}
        />{' '}
        Show active committee only
      </label>

      <div className="form-grid">
        <label>
          Member *
          <select
            disabled={!editing}
            value={form.value.memberId}
            onChange={(event) => {
              const member = members.find((row) => row.id === event.target.value);
              form.patch({
                memberId: event.target.value,
                memberName: member?.memberName ?? '',
                unitNo: member?.unitNo ?? null,
                buildingName: member?.buildingShortName ?? null,
                wingName: member?.wingShortName ?? null,
              });
            }}
          >
            <option value="">Select member</option>
            {members.map((row) => (
              <option key={row.id} value={row.id}>
                {row.memberName} — {row.buildingShortName}/{row.wingShortName}/{row.unitNo}
              </option>
            ))}
          </select>
        </label>
        <label>
          Designation *
          <input
            disabled={!editing}
            value={form.value.designation}
            onChange={(event) => form.patch({ designation: event.target.value })}
          />
        </label>
        <label>
          Effective date
          <input
            type="date"
            disabled={!editing}
            value={form.value.effectiveDate}
            onChange={(event) => form.patch({ effectiveDate: event.target.value })}
          />
        </label>
        <label>
          Term ends on
          <input
            type="date"
            disabled={!editing}
            value={form.value.termEndsOn ?? ''}
            onChange={(event) =>
              form.patch({ termEndsOn: event.target.value || null })
            }
          />
        </label>
        <label>
          Status
          <select
            disabled={!editing}
            value={form.value.status}
            onChange={(event) =>
              form.patch({ status: event.target.value as CommitteeStatus })
            }
          >
            <option value={CommitteeStatus.ACTIVE}>Active</option>
            <option value={CommitteeStatus.INACTIVE}>Inactive</option>
          </select>
        </label>
      </div>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="success-text">{message}</p>}

      <table className="data-grid">
        <thead>
          <tr>
            <th>Member</th>
            <th>Designation</th>
            <th>Effective</th>
            <th>Term ends</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id} onClick={() => selectItem(row)}>
              <td>{row.memberName}</td>
              <td>{row.designation}</td>
              <td>{row.effectiveDate}</td>
              <td>{row.termEndsOn ?? '—'}</td>
              <td>{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete committee member"
        message="Remove this committee record?"
        onConfirm={() => {
          setConfirmDelete(false);
          void (async () => {
            if (!form.value.id) return;
            await window.sams.correspondence.deleteCommittee(form.value.id);
            form.commit(emptyCommitteeMember());
            setMessage('Committee member deleted.');
            await loadList();
          })();
        }}
        onCancel={() => setConfirmDelete(false)}
      />

      <AuditIdentityModal
        open={auditOpen}
        createdBy={form.value.createdBy}
        createdAt={form.value.createdAt}
        updatedBy={form.value.updatedBy}
        updatedAt={form.value.updatedAt}
        onClose={() => setAuditOpen(false)}
      />
    </section>
  );
}
