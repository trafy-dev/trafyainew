import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Shown when the user arrives via a "reset password" email link. Supabase
 * signs them in just enough to let them set a new password; we don't treat
 * this as a real login until updatePassword() succeeds (see AuthContext).
 */
export default function ResetPassword() {
  const { updatePassword, cancelPasswordRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    const { error: err } = await updatePassword(password);
    setBusy(false);

    if (err) setError(err.message);
    else setDone(true);
  };

  if (done) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <img src="/trafy-logo.png" alt="Trafy" className="auth-logo" />
          <h1 className="auth-title">Password updated</h1>
          <p className="auth-sub">You're signed in with your new password.</p>
          <button className="btn btn--primary btn--lg auth-submit" onClick={() => window.location.reload()}>
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <img src="/trafy-logo.png" alt="Trafy" className="auth-logo" />
        <h1 className="auth-title">Set a new password</h1>
        <p className="auth-sub">Choose a new password for your account.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-field">
            <span>New password</span>
            <div className="auth-password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <label className="auth-field">
            <span>Confirm password</span>
            <div className="auth-password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
                required
              />
            </div>
          </label>

          {error && <div className="auth-alert auth-alert--error">{error}</div>}

          <button type="submit" className="btn btn--primary btn--lg auth-submit" disabled={busy}>
            {busy ? 'Updating…' : 'Update password'}
          </button>
        </form>

        <p className="auth-switch">
          <button type="button" onClick={cancelPasswordRecovery}>
            Cancel and sign out
          </button>
        </p>
      </div>
    </div>
  );
}
