import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { isConfigured } from '../lib/supabase';

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.8c-.5 2.8-2 5.1-4.4 6.7v5.5h7.1c4.1-3.8 6.6-9.4 6.6-16.4z" />
      <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.2 15.5 46 24 46z" />
      <path fill="#FBBC05" d="M11.8 28.3c-.4-1.3-.7-2.7-.7-4.3s.2-2.9.7-4.3v-5.7H4.5A22 22 0 0 0 2 24c0 3.6.9 6.9 2.5 9.9l7.3-5.6z" />
      <path fill="#EA4335" d="M24 10.6c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4 29.9 2 24 2 15.5 2 8.1 6.8 4.5 14.1l7.3 5.7c1.7-5.2 6.5-9.2 12.2-9.2z" />
    </svg>
  );
}

export default function Login() {
  const { signInWithGoogle, signInWithPassword, signUpWithPassword } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const handleGoogle = async () => {
    setError('');
    setBusy(true);
    const { error: err } = await signInWithGoogle();
    if (err) {
      setError(err.message);
      setBusy(false);
    }
    // On success the browser redirects to Google, so no cleanup needed.
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    if (mode === 'signup' && password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setBusy(true);
    const run =
      mode === 'signin'
        ? signInWithPassword(email.trim(), password)
        : signUpWithPassword(email.trim(), password, name.trim() || email.split('@')[0]);

    const { data, error: err } = await run;
    setBusy(false);

    if (err) {
      setError(err.message);
      return;
    }
    // Supabase returns a user with no session when email confirmation is on.
    if (mode === 'signup' && data?.user && !data.session) {
      setNotice('Check your inbox to confirm your email, then sign in.');
      setMode('signin');
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <img src="/trafy-logo.png" alt="Trafy" className="auth-logo" />
        <h1 className="auth-title">
          {mode === 'signin' ? 'Sign in to continue' : 'Create your account'}
        </h1>
        <p className="auth-sub">
          Your assessment, progress and results are saved to your account.
        </p>

        {!isConfigured && (
          <div className="auth-alert auth-alert--warn">
            Supabase isn&apos;t configured. Add <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> to <code>assessment-app/.env</code>, then restart
            the dev server.
          </div>
        )}

        <button
          type="button"
          className="auth-google"
          onClick={handleGoogle}
          disabled={busy || !isConfigured}
        >
          <GoogleMark />
          Continue with Google
        </button>

        <div className="auth-divider"><span>or</span></div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <label className="auth-field">
              <span>Full name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada Lovelace"
                autoComplete="name"
              />
            </label>
          )}

          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
            />
          </label>

          {error && <div className="auth-alert auth-alert--error">{error}</div>}
          {notice && <div className="auth-alert auth-alert--ok">{notice}</div>}

          <button type="submit" className="btn btn--primary btn--lg auth-submit" disabled={busy || !isConfigured}>
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'signin' ? "Don't have an account?" : 'Already registered?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError('');
              setNotice('');
            }}
          >
            {mode === 'signin' ? 'Create one' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
