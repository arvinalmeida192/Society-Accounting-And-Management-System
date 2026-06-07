import { useCallback, useEffect, useState } from 'react';
import type {
  MemberListItemDto,
  MemberParkingAssignmentDto,
  ParkingSpaceDto,
} from '@sams/shared-types';
import { AuditIdentityModal, MasterFormToolbar } from '../../components';
import { useFormState } from '../../hooks/useFormState';
import { getIpcErrorMessage } from '../../hooks/session';

const emptyAssignment = (): MemberParkingAssignmentDto => ({
  id: '',
  memberId: '',
  parkingSpaceId: '',
  purchaseDate: new Date().toISOString().slice(0, 10),
  disposeDate: null,
  isActive: true,
  createdAt: '',
  createdBy: '',
  updatedAt: '',
  updatedBy: '',
});

export function ParkingAssignmentsScreen(): React.ReactElement {
  const form = useFormState(emptyAssignment());
  const [items, setItems] = useState<MemberParkingAssignmentDto[]>([]);
  const [spaces, setSpaces] = useState<ParkingSpaceDto[]>([]);
  const [members, setMembers] = useState<MemberListItemDto[]>([]);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    const [assignmentRes, spaceRes, memberRes] = await Promise.all([
      window.sams.property.listParkingAssignments(),
      window.sams.property.listParkingSpaces(),
      window.sams.member.list({ status: 'active' }),
    ]);
    if (assignmentRes.success && assignmentRes.data) setItems(assignmentRes.data);
    if (spaceRes.success && spaceRes.data) setSpaces(spaceRes.data);
    if (memberRes.success && memberRes.data) setMembers(memberRes.data.items);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectItem = (item: MemberParkingAssignmentDto): void => {
    form.commit({
      ...item,
      purchaseDate: item.purchaseDate.slice(0, 10),
      disposeDate: item.disposeDate ? item.disposeDate.slice(0, 10) : null,
    });
    setEditing(false);
    setError(null);
    setMessage(null);
  };

  const save = async (): Promise<void> => {
    if (!form.value.memberId || !form.value.parkingSpaceId) {
      setError('Member and parking space are required.');
      return;
    }
    setError(null);
    const response = await window.sams.property.saveParkingAssignment({
      ...form.value,
      purchaseDate: new Date(form.value.purchaseDate).toISOString(),
      disposeDate: form.value.disposeDate
        ? new Date(form.value.disposeDate).toISOString()
        : null,
    });
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    form.commit({
      ...response.data,
      purchaseDate: response.data.purchaseDate.slice(0, 10),
      disposeDate: response.data.disposeDate
        ? response.data.disposeDate.slice(0, 10)
        : null,
    });
    setEditing(false);
    setMessage('Parking assignment saved.');
    await load();
  };

  const disabled = !editing;

  return (
    <section className="form-screen master-browse-screen">
      <h2>Parking Assignments</h2>
      <p className="muted">Assign parking spaces to active members. Rates are resolved at billing time.</p>
      <MasterFormToolbar
        disabled={{ save: !editing || !form.dirty, cancel: !editing }}
        onAdd={() => {
          form.commit(emptyAssignment());
          setEditing(true);
        }}
        onEdit={() => setEditing(true)}
        onSave={() => void save()}
        onCancel={() => {
          form.reset();
          setEditing(false);
        }}
        onBrowse={() => void load()}
        onUserIdentity={() => setAuditOpen(true)}
      />

      <div className="master-browse-layout">
        <aside className="master-browse-list">
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={form.value.id === item.id ? 'active' : undefined}
                  onClick={() => selectItem(item)}
                >
                  <strong>{item.parkingNo ?? item.parkingSpaceId.slice(0, 8)}</strong>
                  <span>
                    {members.find((m) => m.id === item.memberId)?.memberName ??
                      `Member ${item.memberId.slice(0, 8)}…`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="master-browse-form">
          <div className="form-grid">
            <label>
              Member *
              <select
                disabled={disabled}
                value={form.value.memberId}
                onChange={(event) =>
                  form.setValue({ ...form.value, memberId: event.target.value })
                }
              >
                <option value="">Select…</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.memberName} ({member.buildingShortName}-{member.wingShortName}-
                    {member.unitNo})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Parking Space *
              <select
                disabled={disabled}
                value={form.value.parkingSpaceId}
                onChange={(event) =>
                  form.setValue({ ...form.value, parkingSpaceId: event.target.value })
                }
              >
                <option value="">Select…</option>
                {spaces.map((space) => (
                  <option key={space.id} value={space.id}>
                    {space.parkingNo}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Purchase Date *
              <input
                type="date"
                disabled={disabled}
                value={form.value.purchaseDate}
                onChange={(event) =>
                  form.setValue({ ...form.value, purchaseDate: event.target.value })
                }
              />
            </label>
            <label>
              Dispose Date
              <input
                type="date"
                disabled={disabled}
                value={form.value.disposeDate ?? ''}
                onChange={(event) =>
                  form.setValue({
                    ...form.value,
                    disposeDate: event.target.value || null,
                  })
                }
              />
            </label>
            <label className="checkbox-field">
              <input
                type="checkbox"
                disabled={disabled}
                checked={form.value.isActive}
                onChange={(event) =>
                  form.setValue({ ...form.value, isActive: event.target.checked })
                }
              />
              Active
            </label>
          </div>
        </div>
      </div>

      {message && <p className="form-success">{message}</p>}
      {error && <p className="form-error">{error}</p>}

      <AuditIdentityModal
        open={auditOpen}
        audit={{
          createdAt: form.value.createdAt,
          createdBy: form.value.createdBy,
          updatedAt: form.value.updatedAt,
          updatedBy: form.value.updatedBy,
        }}
        onClose={() => setAuditOpen(false)}
      />
    </section>
  );
}
