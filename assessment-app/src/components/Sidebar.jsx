import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PenTool, Trophy, History, LogOut, UserCircle, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || 'C';

export default function Sidebar() {
  const { displayName, avatarUrl, user, signOut, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const link = ({ isActive }) => `sidebar__item ${isActive ? 'active' : ''}`;

  // Close the mobile drawer on Escape, and whenever the viewport is resized
  // back up past mobile width (so it doesn't stay stuck open behind a
  // desktop layout after e.g. rotating a tablet).
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    const onResize = () => { if (window.innerWidth > 900) setIsOpen(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [isOpen]);

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          className="sidebar__toggle"
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
      )}

      {isOpen && <div className="sidebar__backdrop" onClick={() => setIsOpen(false)} />}

      <aside className={`sidebar ${isOpen ? 'is-open' : ''}`}>
        <div className="sidebar__brand">
          {/* trafy-logo.png is pure white (built for the old dark theme), so
              it's inverted to black here to stay visible on this light sidebar. */}
          <img src="/trafy-logo.png" alt="Trafy" className="sidebar__logo" />
          <button
            type="button"
            className="sidebar__close"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar__nav" onClick={() => setIsOpen(false)}>
          <NavLink to="/" className={link} end>
            <LayoutDashboard className="icon" /> Overview
          </NavLink>
          <NavLink to="/assessment" className={link}>
            <PenTool className="icon" /> Assessment
          </NavLink>
          {isAdmin && (
            <NavLink to="/leaderboard" className={link}>
              <Trophy className="icon" /> Leaderboard
            </NavLink>
          )}
          <NavLink to="/results" className={link}>
            <History className="icon" /> Results
          </NavLink>
          <NavLink to="/profile" className={link}>
            <UserCircle className="icon" /> Profile
          </NavLink>
        </nav>

        <div className="sidebar__footer">
          <NavLink to="/profile" className="user-profile" onClick={() => setIsOpen(false)}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="avatar avatar--img" referrerPolicy="no-referrer" />
            ) : (
              <div className="avatar">{initials(displayName)}</div>
            )}
            <div className="user-info">
              <span className="user-name">{displayName}</span>
              <span className="user-status" title={user?.email}>{user?.email}</span>
            </div>
          </NavLink>
          <button type="button" className="sidebar__signout" onClick={signOut}>
            <LogOut className="icon" /> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
