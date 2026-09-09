import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('master@canteen.local');
  const [password, setPassword] = useState('Master@12345');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand large">
          <span className="brand-mark">🍴</span>
          <div>
            <strong>Canteen ERP</strong>
            <small>Secure management foundation</small>
          </div>
        </div>

        <h1>Welcome back</h1>
        <p className="muted">Sign in to continue.</p>

        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>

        {error && <div className="alert error">{error}</div>}

        <button className="primary" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>

        <div className="demo">
          Demo users:<br />
          Master / Admin / Staff / Member credentials are in README.
        </div>
      </form>
    </div>
  );
}
