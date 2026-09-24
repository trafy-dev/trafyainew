import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../storage';
import { useLms } from '../LmsContext';
import { PageHead, Empty } from '../ui';
import { fmtDateTime, fmtTime, fmtDate, relDue } from '../format';

export default function ClassroomOverview() {
  const { user, isStaff, isAdmin } = useLms();
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      const now = new Date().toISOString();
      const [{ data: asg }, { data: ev }, { data: sub }, { data: crs }] = await Promise.all([
        supabase.from('assignments').select('id, title, due_at, course_id, max_points').gte('due_at', now).order('due_at').limit(5),
        supabase.from('events').select('*').eq('kind', 'class').gte('starts_at', now).order('starts_at').limit(5),
        supabase.from('submissions').select('assignment_id, grade, graded_at').eq('student_id', user.id),
        supabase.from('courses').select('id, title'),
      ]);
      let toGrade = 0;
      if (isStaff) {
        const { count } = await supabase.from('submissions').select('id', { count: 'exact', head: true }).is('grade', null);
        toGrade = count || 0;
      }
      setData({ asg: asg || [], ev: ev || [], sub: sub || [], crs: crs || [], toGrade });
    })();
  }, [user.id, isStaff]);

  if (!data) return <div className="muted">Loading…</div>;
  const cname = Object.fromEntries(data.crs.map((c) => [c.id, c.title]));
  const submitted = new Set(data.sub.map((s) => s.assignment_id));
  const pending = isStaff ? data.asg : data.asg.filter((a) => !submitted.has(a.id));

  return (
    <>
      <PageHead title="Classroom" sub={isAdmin ? 'You have full access to everything.' : isStaff ? 'Here is what needs your attention.' : 'Here is what is coming up.'} />
      <div className="stat-row">
        <div className="card stat"><span className="muted small">{isStaff ? 'Courses' : 'My courses'}</span><strong>{data.crs.length}</strong></div>
        <div className="card stat"><span className="muted small">{isStaff ? 'Upcoming assignments' : 'To do'}</span><strong>{pending.length}</strong></div>
        {isStaff
          ? <div className="card stat"><span className="muted small">Awaiting grading</span><strong>{data.toGrade}</strong></div>
          : <div className="card stat"><span className="muted small">Graded</span><strong>{data.sub.filter((s) => s.grade != null).length}</strong></div>}
      </div>

      <div className="two-col">
        <div className="card">
          <h3>{isStaff ? 'Upcoming deadlines' : 'Due soon'}</h3>
          {pending.length === 0 && <Empty>All clear.</Empty>}
          {pending.map((a) => {
            const d = relDue(a.due_at);
            return (
              <Link key={a.id} to={`/assignments/${a.id}`} className="ev k-deadline">
                <div className="ev-main"><strong>{a.title}</strong><span className="muted small">{cname[a.course_id]} · {fmtDateTime(a.due_at)}</span></div>
                <span className={`badge ${d.tone}`}>{d.text}</span>
              </Link>
            );
          })}
        </div>
        <div className="card">
          <h3>Next classes</h3>
          {data.ev.length === 0 && <Empty>No classes scheduled.</Empty>}
          {data.ev.map((e) => (
            <div key={e.id} className="ev k-class">
              <div className="ev-time">{fmtDate(e.starts_at)}</div>
              <div className="ev-main"><strong>{e.title}</strong><span className="muted small">{fmtTime(e.starts_at)}{e.location ? ` · ${e.location}` : ''}</span></div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
