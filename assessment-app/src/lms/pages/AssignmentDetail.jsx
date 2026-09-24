import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Paperclip, FileText, Trash2 } from 'lucide-react';
import { supabase, fileUrl, uploadFile, safeName } from '../storage';
import { useLms } from '../LmsContext';
import { PageHead, Empty, ErrorNote } from '../ui';
import { fmtDateTime, relDue } from '../format';

export default function AssignmentDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user, isStaff } = useLms();
  const [a, setA] = useState(null);
  const [course, setCourse] = useState(null);
  const [subs, setSubs] = useState([]);
  const [students, setStudents] = useState([]);
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    const { data: asg } = await supabase.from('assignments').select('*').eq('id', id).maybeSingle();
    if (!asg) { setMissing(true); return; }
    setA(asg);
    const [{ data: c }, { data: s }] = await Promise.all([
      supabase.from('courses').select('id, title').eq('id', asg.course_id).maybeSingle(),
      supabase.from('submissions').select('*').eq('assignment_id', id),
    ]);
    setCourse(c); setSubs(s || []);
    if (isStaff) {
      const { data: en } = await supabase.from('enrollments').select('student_id').eq('course_id', asg.course_id);
      const ids = (en || []).map((e) => e.student_id);
      if (ids.length) {
        const { data: p } = await supabase.from('lms_people').select('id, full_name, email').in('id', ids);
        setStudents((p || []).sort((x, y) => x.full_name.localeCompare(y.full_name)));
      } else setStudents([]);
    }
  }, [id, isStaff]);
  useEffect(() => { load(); }, [load]);

  if (missing) return <Empty>Assignment not found, or you do not have access.</Empty>;
  if (!a) return <div className="muted">Loading…</div>;

  const due = relDue(a.due_at);
  const removeAssignment = async () => {
    if (!window.confirm('Delete this assignment and all its submissions?')) return;
    await supabase.from('assignments').delete().eq('id', id);
    nav('/assignments');
  };

  return (
    <>
      <Link to="/assignments" className="back"><ArrowLeft size={15} /> Assignments</Link>
      <PageHead title={a.title} sub={`${course?.title || ''} · Due ${fmtDateTime(a.due_at)} · ${a.max_points} points`}>
        <span className={`badge ${due.tone}`}>{due.text}</span>
        {isStaff && <button className="btn ghost danger" onClick={removeAssignment}><Trash2 size={15} /> Delete</button>}
      </PageHead>
      {a.description && <div className="card"><p className="pre">{a.description}</p></div>}

      {isStaff
        ? <GradeTable a={a} students={students} subs={subs} reload={load} />
        : <MySubmission a={a} sub={subs.find((s) => s.student_id === user.id)} reload={load} />}
    </>
  );
}

function MySubmission({ a, sub, reload }) {
  const { user } = useLms();
  const [text, setText] = useState(sub?.content || '');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const graded = sub?.grade != null;
  const late = new Date() > new Date(a.due_at);

  useEffect(() => { setText(sub?.content || ''); }, [sub?.content]);

  async function submit(e) {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      let file_path = sub?.file_path || null;
      if (file) file_path = await uploadFile(`${a.course_id}/submissions/${user.id}/${Date.now()}-${safeName(file.name)}`, file);
      const row = { assignment_id: a.id, content: text.trim(), file_path };
      const { error: err } = sub
        ? await supabase.from('submissions').update(row).eq('id', sub.id)
        : await supabase.from('submissions').insert(row);
      if (err) throw err;
      setFile(null); await reload();
    } catch (err) { setError(err); }
    setBusy(false);
  }
  const open = async () => { const u = await fileUrl(sub.file_path); if (u) window.open(u, '_blank', 'noopener'); };

  return (
    <div className="card">
      <h3>Your submission</h3>
      {graded && (
        <div className="grade-box">
          <div className="grade-num">{sub.grade}<span>/{a.max_points}</span></div>
          <div>
            <strong>Graded</strong>
            {sub.feedback ? <p className="pre">{sub.feedback}</p> : <p className="muted small">No written feedback.</p>}
          </div>
        </div>
      )}
      <form className="form" onSubmit={submit}>
        <textarea rows={6} disabled={graded} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your answer, or attach a file below." />
        <div className="row">
          {!graded && (
            <label className="btn ghost file-btn"><Paperclip size={15} /> {file ? file.name.slice(0, 26) : 'Attach file'}
              <input type="file" hidden onChange={(e) => setFile(e.target.files[0] || null)} />
            </label>
          )}
          {sub?.file_path && <button type="button" className="chip" onClick={open}><FileText size={14} /> {sub.file_path.split('/').pop().replace(/^\d+-/, '')}</button>}
        </div>
        <ErrorNote error={error} />
        {sub && <p className="muted small">Submitted {fmtDateTime(sub.submitted_at)}{late ? ' (after the deadline)' : ''}. {graded ? '' : 'You can resubmit until it is graded.'}</p>}
        {!graded && <button className="btn primary" disabled={busy || (!text.trim() && !file && !sub?.file_path)}>{busy ? 'Saving…' : sub ? 'Resubmit' : 'Submit'}</button>}
      </form>
    </div>
  );
}

function GradeTable({ a, students, subs, reload }) {
  const bySt = Object.fromEntries(subs.map((s) => [s.student_id, s]));
  const done = subs.filter((s) => s.grade != null).length;
  return (
    <div className="card">
      <h3>Submissions <span className="muted small">{subs.length}/{students.length} submitted · {done} graded</span></h3>
      {students.length === 0 && <Empty>No students are enrolled in this course yet.</Empty>}
      <div className="grade-list">
        {students.map((st) => <GradeRow key={st.id} a={a} st={st} sub={bySt[st.id]} reload={reload} />)}
      </div>
    </div>
  );
}

function GradeRow({ a, st, sub, reload }) {
  const [grade, setGrade] = useState(sub?.grade ?? '');
  const [feedback, setFeedback] = useState(sub?.feedback || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => { setGrade(sub?.grade ?? ''); setFeedback(sub?.feedback || ''); }, [sub?.grade, sub?.feedback]);

  const open = async () => { const u = await fileUrl(sub.file_path); if (u) window.open(u, '_blank', 'noopener'); };
  async function save() {
    setBusy(true); setError(null);
    const { error: err } = await supabase.from('submissions')
      .update({ grade: grade === '' ? null : Number(grade), feedback }).eq('id', sub.id);
    setBusy(false);
    if (err) setError(err); else reload();
  }

  return (
    <div className="grade-row">
      <div className="grade-who">
        <strong>{st.full_name}</strong>
        <span className="muted small">{sub ? `Submitted ${fmtDateTime(sub.submitted_at)}` : 'Not submitted'}</span>
      </div>
      {sub ? (
        <div className="grade-body">
          {sub.content && <p className="pre sub-text">{sub.content}</p>}
          {sub.file_path && <button className="chip" onClick={open}><FileText size={14} /> {sub.file_path.split('/').pop().replace(/^\d+-/, '')}</button>}
          <div className="row">
            <label className="grade-in">Grade
              <input type="number" min="0" max={a.max_points} step="any" value={grade} onChange={(e) => setGrade(e.target.value)} />
              <span className="muted small">/ {a.max_points}</span>
            </label>
            <input className="grow" placeholder="Feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
            <button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save grade'}</button>
          </div>
          <ErrorNote error={error} />
        </div>
      ) : <span className="badge">Missing</span>}
    </div>
  );
}
