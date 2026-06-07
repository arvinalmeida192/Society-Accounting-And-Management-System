import { useEffect, useState } from 'react';
import {
  AuditIdentityModal,
  FilterDrawer,
  MasterFormToolbar,
  PrintPreviewModal,
} from '../../components';
import { useFormState } from '../../hooks/useFormState';
import { getIpcErrorMessage } from '../../hooks/session';
import type { SocietyIdentityDto } from '@sams/shared-types';

const emptyIdentity = (): SocietyIdentityDto => ({
  id: '',
  societyName: '',
  registrationNumber: null,
  registrationDate: null,
  addressLine1: null,
  addressLine2: null,
  addressLine3: null,
  city: null,
  state: null,
  pinCode: null,
  telephone: null,
  fax: null,
  email: null,
  website: null,
  tan: null,
  pan: null,
  tdsCircle: null,
  createdAt: '',
  createdBy: '',
  updatedAt: '',
  updatedBy: '',
});

export function SocietyIdentityScreen(): React.ReactElement {
  const form = useFormState(emptyIdentity());
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  useEffect(() => {
    void window.sams.society.getIdentity().then((response) => {
      if (response.success && response.data) {
        form.commit(response.data);
      } else {
        setError(getIpcErrorMessage(response.error));
      }
    });
  }, []);

  const save = async (): Promise<void> => {
    setError(null);
    setMessage(null);
    const response = await window.sams.society.updateIdentity(form.value);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    form.commit(response.data);
    setEditing(false);
    setMessage('Society identity saved.');
  };

  const disabled = !editing;

  return (
    <section className="form-screen">
      <h2>Society Identity</h2>
      <MasterFormToolbar
        disabled={{ save: !editing || !form.dirty, cancel: !editing, edit: editing }}
        onEdit={() => setEditing(true)}
        onSave={() => void save()}
        onCancel={() => {
          form.reset();
          setEditing(false);
        }}
        onFind={() => setFilterOpen(true)}
        onPrint={() => setPrintOpen(true)}
        onUserIdentity={() => setAuditOpen(true)}
      />

      <div className="form-grid">
        <label>
          Society Name *
          <input
            disabled={disabled}
            value={form.value.societyName}
            onChange={(event) =>
              form.setValue({ ...form.value, societyName: event.target.value })
            }
          />
        </label>
        <label>
          Registration Number
          <input
            disabled={disabled}
            value={form.value.registrationNumber ?? ''}
            onChange={(event) =>
              form.setValue({ ...form.value, registrationNumber: event.target.value })
            }
          />
        </label>
        <label>
          Registration Date
          <input
            type="date"
            disabled={disabled}
            value={form.value.registrationDate?.slice(0, 10) ?? ''}
            onChange={(event) =>
              form.setValue({ ...form.value, registrationDate: event.target.value })
            }
          />
        </label>
        <label>
          Address Line 1
          <input
            disabled={disabled}
            value={form.value.addressLine1 ?? ''}
            onChange={(event) =>
              form.setValue({ ...form.value, addressLine1: event.target.value })
            }
          />
        </label>
        <label>
          City
          <input
            disabled={disabled}
            value={form.value.city ?? ''}
            onChange={(event) => form.setValue({ ...form.value, city: event.target.value })}
          />
        </label>
        <label>
          State
          <input
            disabled={disabled}
            value={form.value.state ?? ''}
            onChange={(event) => form.setValue({ ...form.value, state: event.target.value })}
          />
        </label>
        <label>
          PIN Code
          <input
            disabled={disabled}
            value={form.value.pinCode ?? ''}
            onChange={(event) => form.setValue({ ...form.value, pinCode: event.target.value })}
          />
        </label>
        <label>
          Telephone
          <input
            disabled={disabled}
            value={form.value.telephone ?? ''}
            onChange={(event) =>
              form.setValue({ ...form.value, telephone: event.target.value })
            }
          />
        </label>
        <label>
          Email
          <input
            disabled={disabled}
            value={form.value.email ?? ''}
            onChange={(event) => form.setValue({ ...form.value, email: event.target.value })}
          />
        </label>
        <label>
          PAN
          <input
            disabled={disabled}
            value={form.value.pan ?? ''}
            onChange={(event) => form.setValue({ ...form.value, pan: event.target.value })}
          />
        </label>
        <label>
          TAN
          <input
            disabled={disabled}
            value={form.value.tan ?? ''}
            onChange={(event) => form.setValue({ ...form.value, tan: event.target.value })}
          />
        </label>
        <label>
          TDS Circle
          <input
            disabled={disabled}
            value={form.value.tdsCircle ?? ''}
            onChange={(event) =>
              form.setValue({ ...form.value, tdsCircle: event.target.value })
            }
          />
        </label>
      </div>

      {message && <p className="form-info">{message}</p>}
      {error && <p className="form-error">{error}</p>}

      <AuditIdentityModal
        open={auditOpen}
        audit={form.value.id ? form.value : null}
        onClose={() => setAuditOpen(false)}
      />
      <FilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} onApply={() => setFilterOpen(false)} />
      <PrintPreviewModal
        open={printOpen}
        title="Society Identity"
        html={`<h1>${form.value.societyName}</h1><p>${form.value.city ?? ''}</p>`}
        onClose={() => setPrintOpen(false)}
        onPrint={() => setPrintOpen(false)}
      />
    </section>
  );
}
