import { useEffect, useState, useCallback } from 'react';
import { Paperclip, Link2, Trash2, Send, FileText } from 'lucide-react';
import { supabase, fileUrl, uploadFile, safeName, BUCKET } from '../storage';
import { useLms } from '../LmsContext';
import { PageHead, Empty, RoleBadge, ErrorNote } from '../ui';
import { fmtDateTime } from '../format';

export default function Resources() {
  const { user, isStaff, isAdmin } = useLms();
  const [courses, setCourses] = useState([]);
  const [scope, setScope] = useState(''); // 'staff' = staff room (course_id null), else a course id
  const [items, setItems] = useState([]);
  const [people, setPeople] = useState({});
  const [form, setForm] = useState({ title: '', body: '', url: '' });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: p }] = await Promise.all([
        supabase.from('courses').select('id, title').order('title'),
        supabase.from('lms_people').select('id, full_name, role'),
      ]);
      setCourses(c || []);
      setPeople(Object.fromEntries((p || []).map((x) => [x.id, x])));
      setScope(isStaff ? 'staff' : c?.[0]?.id || '');
    })();
  }, [isStaff]);

  const load = useCallback(async () => {
    if (!scope) { setItems([]); return; }
    let q = supabase.from('resources').select('*').order('created_at', { ascending: true });
    q = scope === 'staff' ? q.is('course_id', null) : q.eq('course_id', scope);
    const { data, error: e } = await q;
    if (e) setError(e); else setItems(data || []);
  }, [scope]);
  useEffect(() => { load(); }, [load]);

  async function post(e) {
    e.preventDefault();
    if (!form.title.trim() && !form.body.trim() && !form.url.trim() && !file) return;
    setBusy(true); setError(null);
    try {
      let file_path = null;
      if (file) {
        if (scope === 'staff') throw new Error('Files can only be attached to a course. Pick a course, or paste a link.');
        file_path = await uploadFile(`${scope}/${Date.now()}-${safeName(file.name)}`, file);
      }
      const { error: err } = await supabase.from('resources').insert({
        course_id: scope === 'staff' ? null : scope,
        title: form.title.trim(), body: form.body.trim(), url: form.url.trim() || null, file_path,
      });
      if (err) throw err;
      setForm({ title: '', body: '', url: '' }); setFile(null);
      await load();
    } catch (err) { setError(err); }
    setBusy(false);
  }

  const remove = async (r) => {
    await supabase.from('resources').delete().eq('id', r.id);
    if (r.file_path) await supabase.storage.from(BUCKET).remove([r.file_path]);
    load();
  };
  const open = async (path) => { const u = await fileUrl(path); if (u) window.open(u, '_blank', 'noopener'); };

  return (
    <>
      <PageHead title="Resources" sub={isStaff ? 'Share notes, links and files. Students can read what you post for their courses.' : 'Materials shared by your teachers.'}>
        <select value={scope} onChange={(e) => setScope(e.target.value)} aria-label="Space">
          {isStaff && <option value="staff">Staff room (admins and teachers only)</option>}
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </PageHead>

      <div className="feed card">
        {items.length === 0 && <Empty>Nothing shared here yet.</Empty>}
        {items.map((r) => {
          const who = people[r.author_id];
          return (
            <article key={r.id} className="post">
              <div className="msg-meta">
                <strong>{who?.full_name || 'Unknown'}</strong>
                {who && <RoleBadge role={who.role} />}
                <span className="muted small">{fmtDateTime(r.created_at)}</span>
                {(r.author_id === user.id || isAdmin) && (
                  <button className="icon-btn tiny" onClick={() => remove(r)} aria-label="Delete"><Trash2 size={13} /></button>
                )}
              </div>
              {r.title && <h3>{r.title}</h3>}
              {r.body && <p className="pre">{r.body}</p>}
              <div className="attach-row">
                {r.url && <a className="chip" href={r.url} target="_blank" rel="noopener noreferrer"><Link2 size={14} /> {r.url.replace(/^https?:\/\//, '').slice(0, 48)}</a>}
                {r.file_path && <button className="chip" onClick={() => open(r.file_path)}><FileText size={14} /> {r.file_path.split('/').pop().replace(/^\d+-/, '')}</button>}
              </div>
            </article>
          );
        })}
      </div>

      {isStaff && scope && (
        <form className="composer card" onSubmit={post}>
          <input placeholder="Title (optional)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea rows={3} placeholder="Write a note…" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <div className="row">
            <input placeholder="https://link (optional)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            <label className="btn ghost file-btn"><Paperclip size={15} /> {file ? file.name.slice(0, 22) : 'Attach file'}
              <input type="file" hidden onChange={(e) => setFile(e.target.files[0] || null)} />
            </label>
            <button className="btn primary" disabled={busy}><Send size={15} /> {busy ? 'Posting…' : 'Post'}</button>
          </div>
          <ErrorNote error={error} />
        </form>
      )}
      {!isStaff && <ErrorNote error={error} />}
    </>
  );
}
