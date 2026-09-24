export const fmtDate = (d) =>
  new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
export const fmtTime = (d) =>
  new Date(d).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
export const fmtDateTime = (d) => `${fmtDate(d)}, ${fmtTime(d)}`;
export const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

/** <input type="datetime-local"> value <-> ISO string, in the user's local zone. */
export const toLocalInput = (iso) => {
  const d = iso ? new Date(iso) : new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
export const fromLocalInput = (v) => new Date(v).toISOString();

export function relDue(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  const days = Math.round(ms / 86400000);
  if (ms < 0) return { text: 'Overdue', tone: 'bad' };
  if (days === 0) return { text: 'Due today', tone: 'warn' };
  if (days === 1) return { text: 'Due tomorrow', tone: 'warn' };
  return { text: `Due in ${days} days`, tone: 'ok' };
}

export const ROLE_RANK = { student: 0, teacher: 1, admin: 2 };
