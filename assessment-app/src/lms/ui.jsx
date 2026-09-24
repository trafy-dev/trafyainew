import { X } from 'lucide-react';

export const RoleBadge = ({ role }) => <span className={`badge role-${role}`}>{role}</span>;

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const Empty = ({ children }) => <div className="empty">{children}</div>;

export const PageHead = ({ title, sub, children }) => (
  <div className="page-head">
    <div>
      <h1>{title}</h1>
      {sub && <p className="muted">{sub}</p>}
    </div>
    <div className="page-actions">{children}</div>
  </div>
);

export const ErrorNote = ({ error }) => (error ? <p className="error">{error.message || String(error)}</p> : null);
