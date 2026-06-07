import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  AdminUserInput,
  FinancialYearInput,
  SocietyIdentityInput,
} from '@sams/shared-types';
import { getIpcErrorMessage } from '../hooks/session';
import { useSession } from '../hooks/SessionContext';

const steps = [
  'Society Identity',
  'Financial Year',
  'Database File',
  'Administrator',
  'Create Database',
  'Complete',
] as const;

const defaultIdentity = (): SocietyIdentityInput => ({
  societyName: '',
  registrationNumber: '',
  addressLine1: '',
  city: '',
  state: '',
  pinCode: '',
  telephone: '',
  email: '',
  pan: '',
});

const defaultFinancialYear = (): FinancialYearInput => {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    startDate: `${year}-04-01`,
    endDate: `${year + 1}-03-31`,
  };
};

export function NewSocietyWizard(): React.ReactElement {
  const navigate = useNavigate();
  const { refreshSession } = useSession();
  const [step, setStep] = useState(0);
  const [identity, setIdentity] = useState(defaultIdentity);
  const [financialYear, setFinancialYear] = useState(defaultFinancialYear);
  const [dbPath, setDbPath] = useState('');
  const [adminUser, setAdminUser] = useState<AdminUserInput>({
    username: 'admin',
    password: '',
    displayName: 'Administrator',
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resultLabel, setResultLabel] = useState('');
  const createStartedRef = useRef(false);

  const nextStep = (): void => {
    setError(null);
    if (step === 0 && !identity.societyName.trim()) {
      setError('Society name is required.');
      return;
    }
    if (step === 1) {
      const start = new Date(financialYear.startDate);
      const end = new Date(financialYear.endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
        setError('Enter a valid financial year date range.');
        return;
      }
    }
    if (step === 2 && !dbPath) {
      setError('Choose a database file location.');
      return;
    }
    if (step === 3) {
      if (!adminUser.username.trim() || !adminUser.displayName.trim()) {
        setError('Administrator username and display name are required.');
        return;
      }
      if (adminUser.password.length < 8) {
        setError('Administrator password must be at least 8 characters.');
        return;
      }
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const pickDatabasePath = async (): Promise<void> => {
    const slug = identity.societyName.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 30);
    const response = await window.sams.startup.pickSaveDatabase(`${slug || 'society'}.sqlite`);
    if (response.success && response.data?.path) {
      setDbPath(response.data.path);
    }
  };

  useEffect(() => {
    if (step !== 4 || busy || createStartedRef.current) {
      return;
    }

    createStartedRef.current = true;

    const create = async (): Promise<void> => {
      setBusy(true);
      setError(null);
      try {
        const response = await window.sams.startup.createSociety({
          identity,
          financialYear,
          dbPath,
          adminUser,
        });
        if (!response.success || !response.data) {
          setError(getIpcErrorMessage(response.error));
          createStartedRef.current = false;
          setStep(3);
          return;
        }
        setResultLabel(`${response.data.societyName} (${response.data.fyLabel})`);
        await refreshSession();
        setStep(5);
      } finally {
        setBusy(false);
      }
    };

    void create();
  }, [step, busy, identity, financialYear, dbPath, adminUser]);

  return (
    <div className="wizard-screen">
      <header>
        <h1>Create New Society</h1>
        <p>
          Step {step + 1} of {steps.length}: {steps[step]}
        </p>
      </header>

      {step === 0 && (
        <section className="wizard-panel">
          <label>
            Society Name *
            <input
              value={identity.societyName}
              onChange={(event) => setIdentity({ ...identity, societyName: event.target.value })}
              required
            />
          </label>
          <label>
            Registration Number
            <input
              value={identity.registrationNumber ?? ''}
              onChange={(event) =>
                setIdentity({ ...identity, registrationNumber: event.target.value })
              }
            />
          </label>
          <label>
            Address Line 1
            <input
              value={identity.addressLine1 ?? ''}
              onChange={(event) => setIdentity({ ...identity, addressLine1: event.target.value })}
            />
          </label>
          <div className="field-row">
            <label>
              City
              <input
                value={identity.city ?? ''}
                onChange={(event) => setIdentity({ ...identity, city: event.target.value })}
              />
            </label>
            <label>
              State
              <input
                value={identity.state ?? ''}
                onChange={(event) => setIdentity({ ...identity, state: event.target.value })}
              />
            </label>
            <label>
              PIN Code
              <input
                value={identity.pinCode ?? ''}
                onChange={(event) => setIdentity({ ...identity, pinCode: event.target.value })}
              />
            </label>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="wizard-panel">
          <label>
            Financial Year Start
            <input
              type="date"
              value={financialYear.startDate}
              onChange={(event) =>
                setFinancialYear({ ...financialYear, startDate: event.target.value })
              }
            />
          </label>
          <label>
            Financial Year End
            <input
              type="date"
              value={financialYear.endDate}
              onChange={(event) =>
                setFinancialYear({ ...financialYear, endDate: event.target.value })
              }
            />
          </label>
        </section>
      )}

      {step === 2 && (
        <section className="wizard-panel">
          <label>
            Database File
            <input value={dbPath} readOnly placeholder="Choose a .sqlite file location" />
          </label>
          <button type="button" onClick={() => void pickDatabasePath()}>
            Browse…
          </button>
        </section>
      )}

      {step === 3 && (
        <section className="wizard-panel">
          <label>
            Username *
            <input
              value={adminUser.username}
              onChange={(event) => setAdminUser({ ...adminUser, username: event.target.value })}
            />
          </label>
          <label>
            Display Name *
            <input
              value={adminUser.displayName}
              onChange={(event) =>
                setAdminUser({ ...adminUser, displayName: event.target.value })
              }
            />
          </label>
          <label>
            Password *
            <input
              type="password"
              value={adminUser.password}
              onChange={(event) => setAdminUser({ ...adminUser, password: event.target.value })}
            />
          </label>
        </section>
      )}

      {step === 4 && (
        <section className="wizard-panel">
          <p>Creating society database and seeding system tables…</p>
          {busy && <p className="muted">Please wait.</p>}
        </section>
      )}

      {step === 5 && (
        <section className="wizard-panel">
          <p>Society database created successfully for {resultLabel}.</p>
          <button
            type="button"
            onClick={() => {
              void refreshSession().then(() => navigate('/login'));
            }}
          >
            Continue to Sign In
          </button>
        </section>
      )}

      {error && <p className="form-error">{error}</p>}

      <footer className="wizard-footer">
        <button type="button" onClick={() => navigate('/startup')}>
          Back to Startup
        </button>
        {step < 4 && (
          <button type="button" onClick={nextStep}>
            Next
          </button>
        )}
      </footer>
    </div>
  );
}
