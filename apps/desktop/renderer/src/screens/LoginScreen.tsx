import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIpcErrorMessage } from '../hooks/session';
import { useSession } from '../hooks/SessionContext';

export function LoginScreen(): React.ReactElement {
  const navigate = useNavigate();
  const { session: sessionInfo, refreshSession } = useSession();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (sessionInfo?.username) {
      setUsername(sessionInfo.username);
    }
  }, [sessionInfo?.username]);

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
      await refreshSession();
      navigate('/app/home');
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
