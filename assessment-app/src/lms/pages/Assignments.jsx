import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { supabase } from '../storage';
import { useLms } from '../LmsContext';
import { PageHead, Modal, Empty, ErrorNote } from '../ui';
import { fmtDateTime, relDue, toLocalInput, fromLocalInput } from '../format';

export default function Assignments() {
  const { user, isStaff } = useLms();
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [mine, setMine] = useState({}); // assignment_id -> my submission
  const [modal, setModal] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    const [{ data: a, error: e }, { data: c }, { data: s }] = await Promise.all([
      supabase.from('assignments').select('*').order('due_at'),
      supabase.from('courses').select('id, title').order('title'),
      supabase.from('submissions').select('assignment_id, grade, submitted_at').eq('student_id', user.id),
    ]);
    if (e) setError(e);
    setAssignments(a || []); setCourses(c || []);
    setMine(Object.fromEntries((s || []).map((x) => [x.assignment_id, x])));
  }, [user.id]);
  useEffect(() => { load(); }, [load]);

  const cname = Object.fromEntries(courses.map((c) => [c.id, c.title]));

  return (
    <>
      <PageHead title="Assignments" sub={isStaff ? 'Create assignments and grade submissions.' : 'Your coursework and deadlines.'}>
        {isStaff && courses.length > 0 && <button className="btn primary" onClick={() => setModal(true)}><Plus size={16} /> New assignment</button>}
      </PageHead>
      <ErrorNote error={error} />
      <div className="list">
        {assignments.length === 0 && <Empty>No assignments yet.</Empty>}
        {assignments.map((a) => {
          const sub = mine[a.id];
          const due = relDue(a.due_at);
          return (
            <Link key={a.id} to={`/assignments/${a.id}`} className="card row-card">
              <div>
                <strong>{a.title}</strong>
                <div className="muted small">{cname[a.course_id]} · Due {fmtDateTime(a.due_at)} · {a.max_points} pts</div>
              </div>
              <div className="row-end">
                {!isStaff && (
                  sub
                    ? <span className={`badge ${sub.grade != null ? 'ok' : ''}`}>{sub.grade != null ? `Graded ${sub.grade}/${a.max_points}` : 'Submitted'}</span>
                    : <span className={`badge ${due.tone}`}>{due.text}</span>
                )}
                {isStaff && <span className={`badge ${due.tone}`}>{due.text}</span>}
              </div>
            </Link>
          );
        })}
      </div>
      {modal && <AssignmentModal courses={courses} onClose={() => setModal(false)} onSaved={() => { setModal(false); load(); }} />}
    </>
  );
}

function AssignmentModal({ courses, onClose, onSaved }) {
  const soon = new Date(Date.now() + 7 * 86400000); soon.setHours(23, 59, 0, 0);
  const [f, setF] = useState({ title: '', description: '', course_id: courses[0]?.id, due: toLocalInput(soon), max_points: 100 });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save(e) {
    e.preventDefault(); setBusy(true); setError(null);
    const { error: err } = await supabase.from('assignments').insert({
      title: f.title.trim(), description: f.description.trim(), course_id: f.course_id,
      due_at: fromLocalInput(f.due), max_points: Number(f.max_points),
    });
    setBusy(false);
    if (err) setError(err); else onSaved();
  }

  return (
    <Modal title="New assignment" onClose={onClose}>
      <form className="form" onSubmit={save}>
        <label>Title<input required value={f.title} onChange={set('title')} /></label>
        <label>Course
          <select value={f.course_id} onChange={set('course_id')}>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
        </label>
        <label>Instructions<textarea rows={4} value={f.description} onChange={set('description')} /></label>
        <div className="row">
          <label>Due<input required type="datetime-local" value={f.due} onChange={set('due')} /></label>
          <label>Max points<input required type="number" min="1" step="any" value={f.max_points} onChange={set('max_points')} /></label>
        </div>
        <ErrorNote error={error} />
        <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Create'}</button>
      </form>
    </Modal>
  );
}
