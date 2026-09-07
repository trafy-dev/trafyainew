import React, { useState } from 'react';
import { X } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const SKIP_KEY = 'trafy_profile_prompt_skipped';

/**
 * One-time prompt (per session) asking for country + university so the
 * admin leaderboard can show them. Skippable — it reappears next login if
 * still unset, but doesn't block using the app.
 */
export default function CompleteProfile() {
  const { refreshProfile } = useAuth();
  const [country, setCountry] = useState('');
  const [university, setUniversity] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(SKIP_KEY) === '1');

  if (dismissed) return null;

  const skip = () => {
    sessionStorage.setItem(SKIP_KEY, '1');
    setDismissed(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!country.trim() || !university.trim()) {
      setError('Fill in both fields, or skip for now.');
      return;
    }

    setBusy(true);
    try {
      await api.patch('/api/auth/me', { country: country.trim(), university: university.trim() });
      await refreshProfile();
      setDismissed(true);
    } catch (err) {
      setError(apiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <button type="button" className="modal-close" onClick={skip} aria-label="Skip for now">
          <X size={18} />
        </button>
        <h2 className="modal-title">Just two more things</h2>
        <p className="modal-sub">Tell us where you're studying — this only takes a second.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-field">
            <span>Country</span>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="India"
              autoComplete="country-name"
            />
          </label>
          <label className="auth-field">
            <span>University</span>
            <input
              type="text"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              placeholder="IIT Madras"
              autoComplete="organization"
            />
          </label>

          {error && <div className="auth-alert auth-alert--error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn btn--ghost btn--md" onClick={skip}>
              Skip for now
            </button>
            <button type="submit" className="btn btn--primary btn--md" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
