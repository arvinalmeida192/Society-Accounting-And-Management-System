import { useCallback, useEffect, useState } from 'react';
import { UserRole, type UserDto, type UserSaveDto } from '@sams/shared-types';
import { ConfirmDialog, MasterFormToolbar } from '../../components';
import { useFormState } from '../../hooks/useFormState';
import { getIpcErrorMessage } from '../../hooks/session';

const emptyUser = (): UserSaveDto => ({
  username: '',
  displayName: '',
  role: UserRole.OPERATOR,
  isActive: true,
  password: '',
});

/** ADM-001 — User management. */
export function UsersScreen(): React.ReactElement {
  const form = useFormState<UserSaveDto>(emptyUser());
  const [users, setUsers] = useState<UserDto[]>([]);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const load = useCallback(async (): Promise<void> => {
    const response = await window.sams.admin.listUsers();
    if (response.success && response.data) setUsers(response.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectUser = (user: UserDto): void => {
    form.commit({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      isActive: user.isActive,
    });
    setEditing(false);
    setError(null);
  };

  const save = async (): Promise<void> => {
    setError(null);
    const response = await window.sams.admin.saveUser(form.value);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setMessage('User saved.');
    setEditing(false);
    form.commit({ ...form.value, id: response.data.id, password: '' });
    await load();
  };

  return (
    <section className="form-screen master-browse-screen">
      <h2>User Management</h2>
      <p className="muted">Passwords are stored using bcrypt only (NF-012).</p>

      <MasterFormToolbar
        disabled={{ save: !editing || !form.dirty, cancel: !editing }}
        onAdd={() => {
          form.commit(emptyUser());
          setEditing(true);
        }}
        onEdit={() => setEditing(true)}
        onSave={() => void save()}
        onCancel={() => {
          form.reset();
          setEditing(false);
        }}
        onBrowse={() => void load()}
      />

      <div className="form-grid">
        <label>
          Username
          <input
            disabled={!editing || Boolean(form.value.id)}
            value={form.value.username}
            onChange={(event) => form.patch({ username: event.target.value })}
          />
        </label>
        <label>
          Display name
          <input
            disabled={!editing}
            value={form.value.displayName}
            onChange={(event) => form.patch({ displayName: event.target.value })}
          />
        </label>
        <label>
          Role
          <select
            disabled={!editing}
            value={form.value.role}
            onChange={(event) => form.patch({ role: event.target.value as UserRole })}
          >
            {Object.values(UserRole).map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
        <label>
          Active
          <input
            type="checkbox"
            disabled={!editing}
            checked={form.value.isActive}
            onChange={(event) => form.patch({ isActive: event.target.checked })}
          />
        </label>
        {editing && !form.value.id && (
          <label>
            Password
            <input
              type="password"
              value={form.value.password ?? ''}
              onChange={(event) => form.patch({ password: event.target.value })}
            />
          </label>
        )}
      </div>

      {form.value.id && (
        <button type="button" onClick={() => setResetOpen(true)}>
          Reset password
        </button>
      )}

      {error && <p className="error-text">{error}</p>}
      {message && <p className="success-text">{message}</p>}

      <table className="data-grid">
        <thead>
          <tr>
            <th>Username</th>
            <th>Name</th>
            <th>Role</th>
            <th>Active</th>
            <th>Last login</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} onClick={() => selectUser(user)}>
              <td>{user.username}</td>
              <td>{user.displayName}</td>
              <td>{user.role}</td>
              <td>{user.isActive ? 'Yes' : 'No'}</td>
              <td>{user.lastLoginAt ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmDialog
        open={resetOpen}
        title="Reset password"
        message="Enter a new password (min 8 characters) for this user."
        onConfirm={() => {
          setResetOpen(false);
          void (async () => {
            if (!form.value.id || !newPassword) return;
            const response = await window.sams.admin.resetPassword({
              userId: form.value.id!,
              newPassword,
            });
            if (!response.success) {
              setError(getIpcErrorMessage(response.error));
              return;
            }
            setMessage('Password reset.');
            setNewPassword('');
          })();
        }}
        onCancel={() => setResetOpen(false)}
      />
      {resetOpen && (
        <label>
          New password
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </label>
      )}
    </section>
  );
}
