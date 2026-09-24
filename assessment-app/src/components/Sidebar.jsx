import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, PenTool, Trophy, History, LogOut, UserCircle, Menu, X,
  MessagesSquare, FolderOpen, CalendarDays, ClipboardList, GraduationCap, BookOpen, Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLms } from '../lms/LmsContext';

const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || 'C';

export default function Sidebar() {
  const { displayName, avatarUrl, user, signOut, isAdmin } = useAuth();
  const lms = useLms();
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
          {/* trafy-logo.png is pure white, which is exactly what the dark sidebar needs. */}
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

          <div className="sidebar__label">Assessments</div>
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

          {lms.available && (
            <>
              <div className="sidebar__label">Classroom</div>
              <NavLink to="/chat" className={link}><MessagesSquare className="icon" /> Chat</NavLink>
              <NavLink to="/resources" className={link}><FolderOpen className="icon" /> Resources</NavLink>
              <NavLink to="/calendar" className={link}><CalendarDays className="icon" /> Calendar</NavLink>
              <NavLink to="/assignments" className={link}><ClipboardList className="icon" /> Assignments</NavLink>
              <NavLink to="/grades" className={link}><GraduationCap className="icon" /> Grades</NavLink>
              {lms.isStaff && (
                <>
                  <div className="sidebar__label">Manage</div>
                  <NavLink to="/courses" className={link}><BookOpen className="icon" /> Courses</NavLink>
                  {lms.isAdmin && <NavLink to="/users" className={link}><Users className="icon" /> Users &amp; roles</NavLink>}
                </>
              )}
            </>
          )}

          <div className="sidebar__label">Account</div>
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
