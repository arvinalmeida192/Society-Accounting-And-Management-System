import { useCallback, useEffect, useState } from 'react';
import type { MeetingAttendeeDto, MeetingMinutesDto, MemberListItemDto } from '@sams/shared-types';
import { AuditIdentityModal, ConfirmDialog, MasterFormToolbar, PrintPreviewModal } from '../../components';
import { useFormState } from '../../hooks/useFormState';
import { getIpcErrorMessage } from '../../hooks/session';

const emptyAttendee = (): MeetingAttendeeDto => ({
  id: '',
  meetingId: '',
  memberId: '',
  memberName: '',
  designation: null,
  attended: true,
  comments: null,
  createdAt: '',
  createdBy: '',
  updatedAt: '',
  updatedBy: '',
});

const emptyMinutes = (): MeetingMinutesDto => ({
  id: '',
  financialYearId: '',
  meetingNo: 0,
  meetingDate: new Date().toISOString().slice(0, 10),
  meetingTime: '',
  natureOfMeeting: '',
  resolutionDetails: '',
  commentsNotings: '',
  attendees: [],
  createdAt: '',
  createdBy: '',
  updatedAt: '',
  updatedBy: '',
});

/** COR-004 — Minutes of Meeting with attendee grid and formal print. */
export function MeetingMinutesScreen(): React.ReactElement {
  const form = useFormState(emptyMinutes());
  const [items, setItems] = useState<MeetingMinutesDto[]>([]);
  const [members, setMembers] = useState<MemberListItemDto[]>([]);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const loadList = useCallback(async (): Promise<void> => {
    const response = await window.sams.correspondence.listMinutes();
    if (response.success && response.data) setItems(response.data);
  }, []);

  const loadMembers = useCallback(async (): Promise<void> => {
    const response = await window.sams.member.list();
    if (response.success && response.data) setMembers(response.data.items);
  }, []);

  useEffect(() => {
    void loadList();
    void loadMembers();
  }, [loadList, loadMembers]);

  const selectItem = (item: MeetingMinutesDto): void => {
    form.commit(item);
    setEditing(false);
    setError(null);
  };

  const save = async (): Promise<void> => {
    setError(null);
    const response = await window.sams.correspondence.saveMinutes(form.value);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    form.commit(response.data);
    setEditing(false);
    setMessage(`Meeting minutes #${response.data.meetingNo} saved.`);
    await loadList();
  };

  const addAttendee = (): void => {
    form.patch({ attendees: [...form.value.attendees, emptyAttendee()] });
  };

  const updateAttendee = (index: number, patch: Partial<MeetingAttendeeDto>): void => {
    const attendees = form.value.attendees.map((row, idx) =>
      idx === index ? { ...row, ...patch } : row,
    );
    form.patch({ attendees });
  };

  const removeAttendee = (index: number): void => {
    form.patch({ attendees: form.value.attendees.filter((_, idx) => idx !== index) });
  };

  const printMinutes = async (): Promise<void> => {
    if (!form.value.id) return;
    const response = await window.sams.correspondence.renderMinutesPrint(form.value.id);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setPreviewHtml(response.data.html);
    setPreviewOpen(true);
  };

  const printPreview = (): void => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    printWindow.document.write(previewHtml ?? '');
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <section className="form-screen master-browse-screen">
      <h2>Minutes of Meeting</h2>
      <p className="muted">Meeting number auto-increments per financial year.</p>

      <MasterFormToolbar
        disabled={{ save: !editing || !form.dirty, cancel: !editing }}
        onAdd={() => {
          form.commit(emptyMinutes());
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
        onPrint={form.value.id ? () => void printMinutes() : undefined}
      />

      <div className="form-grid">
        <label>
          Meeting no.
          <input value={form.value.meetingNo || 'Auto'} readOnly />
        </label>
        <label>
          Meeting date
          <input
            type="date"
            disabled={!editing}
            value={form.value.meetingDate}
            onChange={(event) => form.patch({ meetingDate: event.target.value })}
          />
        </label>
        <label>
          Meeting time
          <input
            disabled={!editing}
            value={form.value.meetingTime ?? ''}
            onChange={(event) => form.patch({ meetingTime: event.target.value })}
          />
        </label>
        <label>
          Nature of meeting
          <input
            disabled={!editing}
            value={form.value.natureOfMeeting ?? ''}
            onChange={(event) => form.patch({ natureOfMeeting: event.target.value })}
          />
        </label>
      </div>

      <label>
        Resolution details
        <textarea
          rows={5}
          disabled={!editing}
          value={form.value.resolutionDetails ?? ''}
          onChange={(event) => form.patch({ resolutionDetails: event.target.value })}
        />
      </label>

      <label>
        Comments / notings
        <textarea
          rows={4}
          disabled={!editing}
          value={form.value.commentsNotings ?? ''}
          onChange={(event) => form.patch({ commentsNotings: event.target.value })}
        />
      </label>

      <div className="toolbar-row">
        <h3>Attendees</h3>
        {editing && (
          <button type="button" onClick={addAttendee}>
            Add attendee
          </button>
        )}
      </div>

      <table className="data-grid">
        <thead>
          <tr>
            <th>Member</th>
            <th>Designation</th>
            <th>Attended</th>
            <th>Comments</th>
            {editing && <th />}
          </tr>
        </thead>
        <tbody>
          {form.value.attendees.map((row, index) => (
            <tr key={`${row.memberId}-${index}`}>
              <td>
                <select
                  disabled={!editing}
                  value={row.memberId}
                  onChange={(event) => {
                    const member = members.find((item) => item.id === event.target.value);
                    updateAttendee(index, {
                      memberId: event.target.value,
                      memberName: member?.memberName ?? '',
                    });
                  }}
                >
                  <option value="">Select member</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.memberName}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  disabled={!editing}
                  value={row.designation ?? ''}
                  onChange={(event) => updateAttendee(index, { designation: event.target.value })}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  disabled={!editing}
                  checked={row.attended}
                  onChange={(event) => updateAttendee(index, { attended: event.target.checked })}
                />
              </td>
              <td>
                <input
                  disabled={!editing}
                  value={row.comments ?? ''}
                  onChange={(event) => updateAttendee(index, { comments: event.target.value })}
                />
              </td>
              {editing && (
                <td>
                  <button type="button" onClick={() => removeAttendee(index)}>
                    Remove
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="success-text">{message}</p>}

      <table className="data-grid">
        <thead>
          <tr>
            <th>No.</th>
            <th>Date</th>
            <th>Nature</th>
            <th>Attendees</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id} onClick={() => selectItem(row)}>
              <td>{row.meetingNo}</td>
              <td>{row.meetingDate}</td>
              <td>{row.natureOfMeeting}</td>
              <td>{row.attendees.length}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete meeting minutes"
        message="Delete this meeting record?"
        onConfirm={() => {
          setConfirmDelete(false);
          void (async () => {
            if (!form.value.id) return;
            await window.sams.correspondence.deleteMinutes(form.value.id);
            form.commit(emptyMinutes());
            setMessage('Meeting minutes deleted.');
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

      <PrintPreviewModal
        open={previewOpen}
        title="Meeting Minutes Preview"
        html={previewHtml ?? ''}
        onClose={() => setPreviewOpen(false)}
        onPrint={printPreview}
      />
    </section>
  );
}
