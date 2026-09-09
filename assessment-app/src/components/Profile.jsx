import React, { useEffect, useState } from 'react';
import { GitBranch, Code2, Briefcase, Camera, Globe, FolderGit2 } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';

// lucide-react 1.x dropped brand/logo glyphs, so these are generic
// stand-ins per platform rather than the actual GitHub/LinkedIn/Instagram logos.
const LINK_FIELDS = [
  { key: 'githubUrl', label: 'GitHub', icon: GitBranch, placeholder: 'github.com/yourhandle' },
  { key: 'leetcodeUrl', label: 'LeetCode', icon: Code2, placeholder: 'leetcode.com/u/yourhandle' },
  { key: 'linkedinUrl', label: 'LinkedIn', icon: Briefcase, placeholder: 'linkedin.com/in/yourname' },
  { key: 'instagramUrl', label: 'Instagram', icon: Camera, placeholder: 'instagram.com/yourhandle' },
  { key: 'portfolioUrl', label: 'Portfolio', icon: Globe, placeholder: 'yoursite.com' },
  { key: 'projectUrl', label: 'Best project', icon: FolderGit2, placeholder: 'Link to something you built' },
];

const emptyForm = {
  displayName: '', country: '', university: '',
  githubUrl: '', leetcodeUrl: '', linkedinUrl: '', instagramUrl: '', portfolioUrl: '', projectUrl: '',
};

export default function Profile() {
  const { profile, user, refreshProfile } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  // Fill the form once the profile has actually loaded (it arrives async).
  useEffect(() => {
    if (!profile) return;
    setForm({
      displayName: profile.displayName || '',
      country: profile.country || '',
      university: profile.university || '',
      githubUrl: profile.githubUrl || '',
      leetcodeUrl: profile.leetcodeUrl || '',
      linkedinUrl: profile.linkedinUrl || '',
      instagramUrl: profile.instagramUrl || '',
      portfolioUrl: profile.portfolioUrl || '',
      projectUrl: profile.projectUrl || '',
    });
  }, [profile]);

  const setField = (key) => (e) => {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);

    if (!form.country.trim() || !form.university.trim()) {
      setError('Country and college/university are required.');
      return;
    }

    setBusy(true);
    try {
      await api.patch('/api/auth/me', form);
      await refreshProfile();
      setSaved(true);
    } catch (err) {
      setError(apiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  if (!profile) return <div className="loader" />;

  return (
    <section className="dashboard-section active">
      <header className="section-header">
        <h1>Your profile</h1>
        <p>This shows up wherever recruiters review your assessment.</p>
      </header>

      <div className="leaderboard-table-wrapper" style={{ padding: 32, maxWidth: 640 }}>
        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-field">
            <span>Email</span>
            <input type="email" value={user?.email || ''} disabled />
          </label>

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
          {saved && <div className="auth-alert auth-alert--ok">Profile saved.</div>}

          <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
            <button type="submit" className="btn btn--primary btn--md" disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
