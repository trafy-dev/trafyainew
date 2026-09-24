import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Trash2, MapPin } from 'lucide-react';
import { supabase } from '../storage';
import { useLms } from '../LmsContext';
import { PageHead, Modal, Empty, ErrorNote } from '../ui';
import { fmtTime, fmtDate, sameDay, toLocalInput } from '../format';

const KIND_LABEL = { class: 'Class', deadline: 'Deadline', event: 'Event' };
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Calendar() {
  const { isStaff, isAdmin } = useLms();
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; });
  const [events, setEvents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selected, setSelected] = useState(() => new Date());
  const [modal, setModal] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    const [{ data: ev, error: e1 }, { data: as }, { data: co }] = await Promise.all([
      supabase.from('events').select('*').order('starts_at'),
      supabase.from('assignments').select('id, course_id, title, due_at'),
      supabase.from('courses').select('id, title').order('title'),
    ]);
    if (e1) setError(e1);
    setEvents(ev || []); setAssignments(as || []); setCourses(co || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const courseName = useMemo(() => Object.fromEntries(courses.map((c) => [c.id, c.title])), [courses]);

  // Assignment due dates appear on the calendar automatically as deadlines.
  const items = useMemo(() => [
    ...events.map((e) => ({ ...e, key: `e${e.id}`, at: e.starts_at })),
    ...assignments.map((a) => ({
      key: `a${a.id}`, kind: 'deadline', title: a.title, at: a.due_at, course_id: a.course_id, assignmentId: a.id,
    })),
  ].sort((a, b) => new Date(a.at) - new Date(b.at)), [events, assignments]);

  const cells = useMemo(() => {
    const first = new Date(cursor);
    const start = new Date(first); start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [cursor]);

  const dayItems = (d) => items.filter((i) => sameDay(i.at, d));
  const shift = (n) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const upcoming = items.filter((i) => new Date(i.at) >= startOfToday).slice(0, 8);

  const removeEvent = async (id) => { await supabase.from('events').delete().eq('id', id); load(); };

  return (
    <>
      <PageHead title="Calendar & schedule" sub="Classes, assignment deadlines and events in one place.">
        {isStaff && <button className="btn primary" onClick={() => setModal(true)}><Plus size={16} /> Add to calendar</button>}
      </PageHead>
      <ErrorNote error={error} />
      <div className="cal-layout">
        <div className="card">
          <div className="cal-head">
            <button className="icon-btn" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
            <h2>{cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
            <button className="icon-btn" onClick={() => shift(1)} aria-label="Next month"><ChevronRight size={18} /></button>
          </div>
          <div className="cal-grid">
            {DOW.map((d) => <div key={d} className="cal-dow">{d}</div>)}
            {cells.map((d) => {
              const its = dayItems(d);
              const out = d.getMonth() !== cursor.getMonth();
              return (
                <button key={d.toISOString()} className={`cal-cell ${out ? 'out' : ''} ${sameDay(d, new Date()) ? 'today' : ''} ${sameDay(d, selected) ? 'sel' : ''}`}
                  onClick={() => setSelected(d)}>
                  <span className="cal-num">{d.getDate()}</span>
                  <span className="dots">{its.slice(0, 4).map((i) => <i key={i.key} className={`dot k-${i.kind}`} />)}</span>
                </button>
              );
            })}
          </div>
          <div className="legend">
            <span><i className="dot k-class" /> Class</span>
            <span><i className="dot k-deadline" /> Deadline</span>
            <span><i className="dot k-event" /> Event</span>
          </div>
        </div>

        <div className="cal-side">
          <div className="card">
            <h3>{fmtDate(selected)}</h3>
            {dayItems(selected).length === 0 && <p className="muted small">Nothing scheduled.</p>}
            {dayItems(selected).map((i) => (
              <div key={i.key} className={`ev k-${i.kind}`}>
                <div className="ev-time">{fmtTime(i.at)}</div>
                <div className="ev-main">
                  <strong>{i.assignmentId ? <Link to={`/assignments/${i.assignmentId}`}>{i.title}</Link> : i.title}</strong>
                  <span className="muted small">{KIND_LABEL[i.kind]}{i.course_id ? ` · ${courseName[i.course_id] || ''}` : ' · Everyone'}</span>
                  {i.location && <span className="muted small"><MapPin size={11} /> {i.location}</span>}
                </div>
                {!i.assignmentId && (isAdmin || (isStaff && i.course_id)) && (
                  <button className="icon-btn tiny" onClick={() => removeEvent(i.id)} aria-label="Delete"><Trash2 size={13} /></button>
                )}
              </div>
            ))}
          </div>
          <div className="card">
            <h3>Coming up</h3>
            {upcoming.length === 0 && <Empty>Nothing coming up.</Empty>}
            {upcoming.map((i) => (
              <div key={i.key} className={`ev k-${i.kind}`}>
                <div className="ev-time">{fmtDate(i.at)}</div>
                <div className="ev-main"><strong>{i.title}</strong><span className="muted small">{fmtTime(i.at)} · {KIND_LABEL[i.kind]}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {modal && <EventModal courses={courses} isAdmin={isAdmin} defaultDate={selected} onClose={() => setModal(false)} onSaved={() => { setModal(false); load(); }} />}
    </>
  );
}

function EventModal({ courses, isAdmin, defaultDate, onClose, onSaved }) {
  const start = new Date(defaultDate); start.setHours(10, 0, 0, 0);
  const [f, setF] = useState({ title: '', kind: 'class', course_id: courses[0]?.id || '', starts: toLocalInput(start), ends: '', location: '', weeks: 1 });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save(e) {
    e.preventDefault(); setBusy(true); setError(null);
    const weeks = f.kind === 'class' ? Math.max(1, Math.min(52, Number(f.weeks) || 1)) : 1;
    const rows = Array.from({ length: weeks }, (_, i) => {
      const s = new Date(f.starts); s.setDate(s.getDate() + 7 * i);
      let en = null;
      if (f.ends) { en = new Date(f.ends); en.setDate(en.getDate() + 7 * i); }
      return {
        title: f.title.trim(), kind: f.kind, course_id: f.course_id || null, location: f.location.trim(),
        starts_at: s.toISOString(), ends_at: en ? en.toISOString() : null,
      };
    });
    const { error: err } = await supabase.from('events').insert(rows);
    setBusy(false);
    if (err) setError(err); else onSaved();
  }

  return (
    <Modal title="Add to calendar" onClose={onClose}>
      <form className="form" onSubmit={save}>
        <label>Title<input required value={f.title} onChange={set('title')} /></label>
        <div className="row">
          <label>Type
            <select value={f.kind} onChange={set('kind')}>
              <option value="class">Class (schedule)</option><option value="deadline">Deadline</option><option value="event">Event</option>
            </select>
          </label>
          <label>For
            <select value={f.course_id} onChange={set('course_id')}>
              {isAdmin && <option value="">Everyone</option>}
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </label>
        </div>
        <div className="row">
          <label>Starts<input required type="datetime-local" value={f.starts} onChange={set('starts')} /></label>
          <label>Ends (optional)<input type="datetime-local" value={f.ends} onChange={set('ends')} /></label>
        </div>
        <label>Location / link<input value={f.location} onChange={set('location')} placeholder="Room 204 or meeting link" /></label>
        {f.kind === 'class' && (
          <label>Repeat weekly for how many weeks?<input type="number" min="1" max="52" value={f.weeks} onChange={set('weeks')} /></label>
        )}
        <ErrorNote error={error} />
        <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </form>
    </Modal>
  );
}
