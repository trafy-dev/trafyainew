import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../storage';
import { useLms } from '../LmsContext';
import { PageHead, Empty } from '../ui';

const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);

export default function Grades() {
  const { user, isStaff } = useLms();
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [subs, setSubs] = useState([]);
  const [students, setStudents] = useState([]);
  const [enrolls, setEnrolls] = useState([]);
  const [courseId, setCourseId] = useState('');

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: a }, { data: s }] = await Promise.all([
        supabase.from('courses').select('id, title').order('title'),
        supabase.from('assignments').select('id, course_id, title, max_points, due_at').order('due_at'),
        supabase.from('submissions').select('assignment_id, student_id, grade'),
      ]);
      setCourses(c || []); setAssignments(a || []); setSubs(s || []);
      setCourseId(c?.[0]?.id || '');
      if (isStaff) {
        const [{ data: en }, { data: p }] = await Promise.all([
          supabase.from('enrollments').select('course_id, student_id'),
          supabase.from('lms_people').select('id, full_name'),
        ]);
        setEnrolls(en || []); setStudents(p || []);
      }
    })();
  }, [isStaff]);

  const cAssignments = assignments.filter((a) => a.course_id === courseId);
  const gradeOf = (aid, sid) => subs.find((s) => s.assignment_id === aid && s.student_id === sid);

  return (
    <>
      <PageHead title="Grades" sub={isStaff ? 'Gradebook for your courses.' : 'Your results across all courses.'}>
        <select value={courseId} onChange={(e) => setCourseId(e.target.value)} aria-label="Course">
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </PageHead>

      {courses.length === 0 && <Empty>No courses yet.</Empty>}

      {courseId && !isStaff && <StudentView assignments={cAssignments} gradeOf={(aid) => gradeOf(aid, user.id)} />}

      {courseId && isStaff && (
        <Gradebook
          assignments={cAssignments}
          roster={enrolls.filter((e) => e.course_id === courseId).map((e) => students.find((s) => s.id === e.student_id)).filter(Boolean)
            .sort((a, b) => a.full_name.localeCompare(b.full_name))}
          gradeOf={gradeOf}
        />
      )}
    </>
  );
}

function StudentView({ assignments, gradeOf }) {
  const graded = assignments.filter((a) => gradeOf(a.id)?.grade != null);
  const earned = graded.reduce((n, a) => n + Number(gradeOf(a.id).grade), 0);
  const possible = graded.reduce((n, a) => n + Number(a.max_points), 0);
  return (
    <>
      <div className="stat-row">
        <div className="card stat"><span className="muted small">Overall</span><strong>{possible ? `${pct(earned, possible)}%` : '—'}</strong></div>
        <div className="card stat"><span className="muted small">Points</span><strong>{earned} / {possible}</strong></div>
        <div className="card stat"><span className="muted small">Graded</span><strong>{graded.length} / {assignments.length}</strong></div>
      </div>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Assignment</th><th>Status</th><th className="num">Score</th></tr></thead>
          <tbody>
            {assignments.length === 0 && <tr><td colSpan="3"><Empty>No assignments in this course.</Empty></td></tr>}
            {assignments.map((a) => {
              const s = gradeOf(a.id);
              return (
                <tr key={a.id}>
                  <td><Link to={`/assignments/${a.id}`}>{a.title}</Link></td>
                  <td>{s ? (s.grade != null ? <span className="badge ok">Graded</span> : <span className="badge">Awaiting grade</span>) : <span className="badge warn">Not submitted</span>}</td>
                  <td className="num">{s?.grade != null ? `${s.grade} / ${a.max_points} (${pct(s.grade, a.max_points)}%)` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Gradebook({ assignments, roster, gradeOf }) {
  if (roster.length === 0) return <Empty>No students are enrolled in this course.</Empty>;
  return (
    <div className="card table-wrap">
      <table>
        <thead>
          <tr>
            <th>Student</th>
            {assignments.map((a) => <th key={a.id} className="num"><Link to={`/assignments/${a.id}`}>{a.title}</Link><div className="muted small">/ {a.max_points}</div></th>)}
            <th className="num">Overall</th>
          </tr>
        </thead>
        <tbody>
          {roster.map((st) => {
            let earned = 0; let possible = 0;
            const cells = assignments.map((a) => {
              const g = gradeOf(a.id, st.id);
              if (g?.grade != null) { earned += Number(g.grade); possible += Number(a.max_points); return <td key={a.id} className="num">{g.grade}</td>; }
              return <td key={a.id} className="num muted">{g ? 'ungraded' : '—'}</td>;
            });
            return <tr key={st.id}><td>{st.full_name}</td>{cells}<td className="num"><strong>{possible ? `${pct(earned, possible)}%` : '—'}</strong></td></tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}
