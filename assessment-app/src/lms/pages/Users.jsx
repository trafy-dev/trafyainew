import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../storage';
import { useLms } from '../LmsContext';
import { PageHead, ErrorNote, RoleBadge } from '../ui';
import { fmtDate } from '../format';

export default function Users() {
  const { user } = useLms();
  const [people, setPeople] = useState([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from('lms_people').select('*').order('created_at');
    if (e) setError(e); else setPeople(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function setRole(p, role) {
    if (p.id === user.id && role !== 'admin' && !window.confirm('You are about to remove your own admin access. Continue?')) return;
    setError(null);
    const { error: err } = await supabase.from('profiles').update({ role }).eq('id', p.id);
    if (err) setError(err);
    load();
  }

  const rows = people.filter((p) => `${p.full_name} ${p.email} ${p.role}`.toLowerCase().includes(q.toLowerCase()));
  const counts = ['admin', 'teacher', 'student'].map((r) => [r, people.filter((p) => p.role === r).length]);

  return (
    <>
      <PageHead title="Users & roles" sub="Promote accounts to teacher or admin. Everyone starts as a student.">
        <input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
      </PageHead>
      <div className="stat-row">
        {counts.map(([r, n]) => <div key={r} className="card stat"><span className="muted small">{r}s</span><strong>{n}</strong></div>)}
      </div>
      <ErrorNote error={error} />
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Role</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.full_name}{p.id === user.id && <span className="muted small"> (you)</span>}</td>
                <td className="muted">{p.email}</td>
                <td className="muted">{fmtDate(p.created_at)}</td>
                <td>
                  <select value={p.role} onChange={(e) => setRole(p, e.target.value)} aria-label={`Role for ${p.full_name}`}>
                    <option value="student">student</option><option value="teacher">teacher</option><option value="admin">admin</option>
                  </select>{' '}<RoleBadge role={p.role} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
