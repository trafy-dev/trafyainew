import { useEffect, useState, useCallback } from 'react';
import { Plus, Users as UsersIcon, Trash2, X } from 'lucide-react';
import { supabase } from '../storage';
import { useLms } from '../LmsContext';
import { PageHead, Modal, Empty, ErrorNote } from '../ui';

export default function Courses() {
  const { isAdmin } = useLms();
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [enrolls, setEnrolls] = useState([]);
  const [modal, setModal] = useState(null); // 'new' | course (roster)
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    const [{ data: c, error: e }, { data: p }, { data: en }] = await Promise.all([
      supabase.from('courses').select('*').order('title'),
      supabase.from('lms_people').select('id, full_name, email, role').order('full_name'),
      supabase.from('enrollments').select('course_id, student_id'),
    ]);
    if (e) setError(e);
    setCourses(c || []); setEnrolls(en || []);
    setTeachers((p || []).filter((x) => x.role === 'teacher' || x.role === 'admin'));
    setStudents((p || []).filter((x) => x.role === 'student'));
  }, []);
  useEffect(() => { load(); }, [load]);

  const tname = (id) => teachers.find((t) => t.id === id)?.full_name || 'Unassigned';
  const count = (id) => enrolls.filter((e) => e.course_id === id).length;

  const setTeacher = async (id, teacher_id) => {
    await supabase.from('courses').update({ teacher_id: teacher_id || null }).eq('id', id); load();
  };
  const removeCourse = async (c) => {
    if (!window.confirm(`Delete "${c.title}" with all its assignments, chat and resources?`)) return;
    await supabase.from('courses').delete().eq('id', c.id); load();
  };

  return (
    <>
      <PageHead title="Courses" sub={isAdmin ? 'Create courses, assign teachers and manage rosters.' : 'Courses you teach and their rosters.'}>
        {isAdmin && <button className="btn primary" onClick={() => setModal('new')}><Plus size={16} /> New course</button>}
      </PageHead>
      <ErrorNote error={error} />
      <div className="list">
        {courses.length === 0 && <Empty>{isAdmin ? 'Create your first course.' : 'You have not been assigned any courses yet.'}</Empty>}
        {courses.map((c) => (
          <div key={c.id} className="card row-card static">
            <div>
              <strong>{c.title}</strong>
              {c.description && <div className="muted small">{c.description}</div>}
              <div className="muted small">Teacher: {tname(c.teacher_id)} · {count(c.id)} students</div>
            </div>
            <div className="row-end">
              {isAdmin && (
                <select value={c.teacher_id || ''} onChange={(e) => setTeacher(c.id, e.target.value)} aria-label="Teacher">
                  <option value="">Unassigned</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              )}
              <button className="btn ghost" onClick={() => setModal(c)}><UsersIcon size={15} /> Roster</button>
              {isAdmin && <button className="icon-btn" onClick={() => removeCourse(c)} aria-label="Delete course"><Trash2 size={16} /></button>}
            </div>
          </div>
        ))}
      </div>
      {modal === 'new' && <NewCourse teachers={teachers} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal && modal !== 'new' && (
        <Roster course={modal} students={students} enrolled={enrolls.filter((e) => e.course_id === modal.id).map((e) => e.student_id)} onClose={() => setModal(null)} reload={load} />
      )}
    </>
  );
}

function NewCourse({ teachers, onClose, onSaved }) {
  const [f, setF] = useState({ title: '', description: '', teacher_id: '' });
  const [error, setError] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function save(e) {
    e.preventDefault();
    const { error: err } = await supabase.from('courses').insert({ title: f.title.trim(), description: f.description.trim(), teacher_id: f.teacher_id || null });
    if (err) setError(err); else onSaved();
  }
  return (
    <Modal title="New course" onClose={onClose}>
      <form className="form" onSubmit={save}>
        <label>Title<input required value={f.title} onChange={set('title')} /></label>
        <label>Description<textarea rows={3} value={f.description} onChange={set('description')} /></label>
        <label>Teacher
          <select value={f.teacher_id} onChange={set('teacher_id')}>
            <option value="">Assign later</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </select>
        </label>
        <ErrorNote error={error} />
        <button className="btn primary">Create course</button>
      </form>
    </Modal>
  );
}

function Roster({ course, students, enrolled, onClose, reload }) {
  const [q, setQ] = useState('');
  const [error, setError] = useState(null);
  const inSet = new Set(enrolled);
  const add = async (sid) => {
    const { error: err } = await supabase.from('enrollments').insert({ course_id: course.id, student_id: sid });
    if (err) setError(err); else reload();
  };
  const drop = async (sid) => {
    await supabase.from('enrollments').delete().eq('course_id', course.id).eq('student_id', sid); reload();
  };
  const match = (s) => `${s.full_name} ${s.email}`.toLowerCase().includes(q.toLowerCase());
  const rows = students.filter(match);

  return (
    <Modal title={`Roster: ${course.title}`} onClose={onClose}>
      <input placeholder="Search students" value={q} onChange={(e) => setQ(e.target.value)} />
      <ErrorNote error={error} />
      <div className="roster">
        {rows.length === 0 && <Empty>No students found. New accounts sign up as students.</Empty>}
        {rows.map((s) => (
          <div key={s.id} className="roster-row">
            <div><strong>{s.full_name}</strong><div className="muted small">{s.email}</div></div>
            {inSet.has(s.id)
              ? <button className="btn ghost" onClick={() => drop(s.id)}><X size={14} /> Remove</button>
              : <button className="btn primary" onClick={() => add(s.id)}><Plus size={14} /> Enroll</button>}
          </div>
        ))}
      </div>
    </Modal>
  );
}
