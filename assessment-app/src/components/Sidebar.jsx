import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PenTool, Trophy, History, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || 'C';

export default function Sidebar() {
  const { displayName, avatarUrl, user, signOut } = useAuth();

  const link = ({ isActive }) => `sidebar__item ${isActive ? 'active' : ''}`;

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <img src="/trafy-logo.png" alt="Trafy" className="sidebar__logo" style={{ height: 32 }} />
      </div>

      <nav className="sidebar__nav">
        <NavLink to="/" className={link} end>
          <LayoutDashboard className="icon" /> Overview
        </NavLink>
        <NavLink to="/assessment" className={link}>
          <PenTool className="icon" /> Assessment
        </NavLink>
        <NavLink to="/leaderboard" className={link}>
          <Trophy className="icon" /> Leaderboard
        </NavLink>
        <NavLink to="/results" className={link}>
          <History className="icon" /> Results
        </NavLink>
      </nav>

      <div className="sidebar__footer">
        <div className="user-profile">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="avatar avatar--img" referrerPolicy="no-referrer" />
          ) : (
            <div className="avatar">{initials(displayName)}</div>
          )}
          <div className="user-info">
            <span className="user-name">{displayName}</span>
            <span className="user-status" title={user?.email}>{user?.email}</span>
          </div>
        </div>
        <button type="button" className="sidebar__signout" onClick={signOut}>
          <LogOut className="icon" /> Sign out
        </button>
      </div>
    </aside>
  );
}
