import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SessionDto } from '@sams/shared-types';
import { getIpcErrorMessage } from '../hooks/session';

interface LoginScreenProps {
  onLoggedIn: () => void;
}

export function LoginScreen({ onLoggedIn }: LoginScreenProps): React.ReactElement {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [sessionInfo, setSessionInfo] = useState<SessionDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void window.sams.auth.getSession().then((res) => {
      if (res.success && res.data) {
        setSessionInfo(res.data);
      }
    });
  }, []);

  const onSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const response = await window.sams.auth.login(username, password);
      if (!response.success) {
        setError(getIpcErrorMessage(response.error));
        return;
      }
      onLoggedIn();
      navigate('/app');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>Sign In</h1>
        {sessionInfo?.societyName && (
          <p className="auth-context">
            {sessionInfo.societyName}
            {sessionInfo.fyLabel ? ` · FY ${sessionInfo.fyLabel}` : ''}
          </p>
        )}
        <form onSubmit={(event) => void onSubmit(event)}>
          <label>
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
