import { useEffect, useState } from 'react';
import type { AccountCategoryType, AccountPickerItem, CoaPickerKind } from '@sams/shared-types';
import { getIpcErrorMessage } from '../hooks/session';

interface AccountPickerModalProps {
  open: boolean;
  title: string;
  kind?: CoaPickerKind;
  categoryId?: AccountCategoryType;
  groupId?: string;
  onClose: () => void;
  onSelect?: (item: AccountPickerItem) => void;
}

export function AccountPickerModal({
  open,
  title,
  kind = 'ACCOUNT',
  categoryId,
  groupId,
  onClose,
  onSelect,
}: AccountPickerModalProps): React.ReactElement | null {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<AccountPickerItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setQuery('');
    setError(null);
    void search('');
  }, [open, kind, categoryId, groupId]);

  const search = async (value: string): Promise<void> => {
    setLoading(true);
    setError(null);
    const response = await window.sams.coa.searchForPicker(value, kind, {
      activeOnly: true,
      categoryId,
      groupId,
    });
    setLoading(false);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      setItems([]);
      return;
    }
    setItems(response.data);
  };

  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal-card account-picker" role="dialog" onClick={(event) => event.stopPropagation()}>
        <h3>{title}</h3>
        <input
          className="account-picker-search"
          placeholder="Search by name or short code…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            void search(event.target.value);
          }}
          autoFocus
        />
        {loading && <p className="muted">Searching…</p>}
        {error && <p className="form-error">{error}</p>}
        <ul className="account-picker-list">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect?.(item);
                  onClose();
                }}
              >
                <strong>{item.label}</strong>
                <span>{item.categoryName}</span>
              </button>
            </li>
          ))}
          {!loading && items.length === 0 && <li className="muted">No matching accounts found.</li>}
        </ul>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
