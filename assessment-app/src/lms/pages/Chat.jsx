import { useEffect, useRef, useState, useCallback } from 'react';
import { Send, Hash, Lock, BookOpen, Trash2 } from 'lucide-react';
import { supabase } from '../storage';
import { useLms } from '../LmsContext';
import { RoleBadge, PageHead, Empty } from '../ui';
import { fmtDate, fmtTime, sameDay } from '../format';

const ICON = { general: Hash, staff: Lock, course: BookOpen };

export default function Chat() {
  const { user, isAdmin } = useLms();
  const [channels, setChannels] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [people, setPeople] = useState({});
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    (async () => {
      const [{ data: ch }, { data: pr }] = await Promise.all([
        supabase.from('channels').select('*'),
        supabase.from('lms_people').select('id, full_name, role'),
      ]);
      const order = { general: 0, course: 1, staff: 2 };
      const sorted = (ch || []).sort((a, b) => order[a.kind] - order[b.kind] || a.name.localeCompare(b.name));
      setChannels(sorted);
      setPeople(Object.fromEntries((pr || []).map((p) => [p.id, p])));
      if (sorted[0]) setActiveId(sorted[0].id);
    })();
  }, []);

  const load = useCallback(async (id) => {
    const { data, error: e } = await supabase.from('messages').select('*').eq('channel_id', id)
      .order('created_at', { ascending: false }).limit(200);
    if (e) setError(e); else setMessages((data || []).reverse());
  }, []);

  useEffect(() => {
    if (!activeId) return undefined;
    setMessages([]); setError(null);
    load(activeId);
    const sub = supabase.channel(`msgs-${activeId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${activeId}` },
        (p) => setMessages((m) => (m.some((x) => x.id === p.new.id) ? m : [...m, p.new])))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' },
        (p) => setMessages((m) => m.filter((x) => x.id !== p.old.id)))
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [activeId, load]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages]);

  async function send(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText('');
    const { data, error: err } = await supabase.from('messages').insert({ channel_id: activeId, body }).select().single();
    if (err) { setError(err); setText(body); }
    else setMessages((m) => (m.some((x) => x.id === data.id) ? m : [...m, data]));
  }

  const remove = async (id) => {
    setMessages((m) => m.filter((x) => x.id !== id));
    await supabase.from('messages').delete().eq('id', id);
  };

  const active = channels.find((c) => c.id === activeId);

  return (
    <>
      <PageHead title="Chat" sub="Talk with your class, teachers and admins." />
      <div className="chat">
        <div className="chat-channels">
          {channels.map((c) => {
            const Icon = ICON[c.kind];
            return (
              <button key={c.id} className={`channel ${c.id === activeId ? 'active' : ''}`} onClick={() => setActiveId(c.id)}>
                <Icon size={16} /> <span>{c.name}</span>
              </button>
            );
          })}
        </div>
        <div className="chat-main">
          {!active ? <Empty>No channels yet.</Empty> : (
            <>
              <div className="chat-title">
                {active.name}
                {active.kind === 'staff' && <span className="badge">staff only</span>}
              </div>
              <div className="chat-log">
                {messages.length === 0 && <Empty>No messages yet, say hello.</Empty>}
                {messages.map((m, i) => {
                  const who = people[m.user_id];
                  const prev = messages[i - 1];
                  const newDay = !prev || !sameDay(prev.created_at, m.created_at);
                  const mine = m.user_id === user.id;
                  return (
                    <div key={m.id}>
                      {newDay && <div className="day-sep">{fmtDate(m.created_at)}</div>}
                      <div className={`msg ${mine ? 'mine' : ''}`}>
                        <div className="msg-meta">
                          <strong>{who?.full_name || 'Unknown'}</strong>
                          {who && who.role !== 'student' && <RoleBadge role={who.role} />}
                          <span className="muted small">{fmtTime(m.created_at)}</span>
                          {(mine || isAdmin) && (
                            <button className="icon-btn tiny" onClick={() => remove(m.id)} aria-label="Delete message"><Trash2 size={13} /></button>
                          )}
                        </div>
                        <div className="msg-body">{m.body}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
              {error && <p className="error">{error.message}</p>}
              <form className="chat-input" onSubmit={send}>
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message ${active.name}`} maxLength={4000} />
                <button className="btn primary" aria-label="Send"><Send size={16} /></button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
