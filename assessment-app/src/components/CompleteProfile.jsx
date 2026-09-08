import React, { useState } from 'react';
import { GitBranch, Code2, Briefcase, Camera, Globe, FolderGit2 } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const SKIP_KEY = 'trafy_profile_prompt_skipped';

// lucide-react 1.x dropped brand/logo glyphs (Github, Linkedin, Instagram no
// longer exist as exports), so these use generic icons that read reasonably
// for each platform instead.
const LINK_FIELDS = [
  { key: 'githubUrl', label: 'GitHub', icon: GitBranch, placeholder: 'github.com/yourhandle' },
  { key: 'leetcodeUrl', label: 'LeetCode', icon: Code2, placeholder: 'leetcode.com/u/yourhandle' },
  { key: 'linkedinUrl', label: 'LinkedIn', icon: Briefcase, placeholder: 'linkedin.com/in/yourname' },
  { key: 'instagramUrl', label: 'Instagram', icon: Camera, placeholder: 'instagram.com/yourhandle' },
  { key: 'portfolioUrl', label: 'Portfolio', icon: Globe, placeholder: 'yoursite.com' },
  { key: 'projectUrl', label: 'Best project', icon: FolderGit2, placeholder: 'Link to something you built' },
];

/**
 * Shown once per session after login if core profile fields (country/
 * university) aren't set yet. Everything here is optional and skippable —
 * it reappears next login only while country/university stay unset.
 */
export default function CompleteProfile() {
  const { profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    displayName: profile?.displayName || '',
    country: profile?.country || '',
    university: profile?.university || '',
    githubUrl: profile?.githubUrl || '',
    leetcodeUrl: profile?.leetcodeUrl || '',
    linkedinUrl: profile?.linkedinUrl || '',
    instagramUrl: profile?.instagramUrl || '',
    portfolioUrl: profile?.portfolioUrl || '',
    projectUrl: profile?.projectUrl || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(SKIP_KEY) === '1');

  if (dismissed) return null;

  const skip = () => {
    sessionStorage.setItem(SKIP_KEY, '1');
    setDismissed(true);
  };

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.country.trim() || !form.university.trim()) {
      setError('Country and college/university are required — everything else is optional.');
      return;
    }

    setBusy(true);
    try {
      await api.patch('/api/auth/me', form);
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
      <div className="auth-card profile-card">
        <img src="/trafy-logo.png" alt="Trafy" className="auth-logo" />
        <h1 className="auth-title">Complete your profile</h1>
        <p className="auth-sub">
          This shows up wherever recruiters review your assessment. Country and college are
          required — the links below are optional, add whichever apply.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-field">
            <span>Name</span>
            <input type="text" value={form.displayName} onChange={setField('displayName')} placeholder="Ada Lovelace" />
          </label>

          <div className="profile-field-row">
            <label className="auth-field">
              <span>Country *</span>
              <input type="text" value={form.country} onChange={setField('country')} placeholder="India" required />
            </label>
            <label className="auth-field">
              <span>College / University *</span>
              <input type="text" value={form.university} onChange={setField('university')} placeholder="IIT Madras" required />
            </label>
          </div>

          <div className="profile-links-divider">Links <span>(optional)</span></div>

          <div className="profile-links-grid">
            {LINK_FIELDS.map(({ key, label, icon: Icon, placeholder }) => (
              <label className="auth-field profile-link-field" key={key}>
                <span><Icon size={14} /> {label}</span>
                <input type="text" value={form[key]} onChange={setField(key)} placeholder={placeholder} />
              </label>
            ))}
          </div>

          {error && <div className="auth-alert auth-alert--error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn btn--ghost btn--md" onClick={skip}>
              Skip for now
            </button>
            <button type="submit" className="btn btn--primary btn--md" disabled={busy}>
              {busy ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
