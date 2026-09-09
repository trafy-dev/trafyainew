import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PenTool, Trophy, History, LogOut, UserCircle } from 'lucide-react';
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

  const link = ({ isActive }) => `sidebar__item ${isActive ? 'active' : ''}`;

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        {/* trafy-logo.png is a white wordmark meant for a dark background —
            invisible on this light theme's white sidebar, so the mark here
            is the colored favicon glyph plus a plain-text wordmark instead. */}
        <img src="/favicon.svg" alt="" className="sidebar__mark" aria-hidden="true" />
        <span className="sidebar__wordmark">Trafy</span>
      </div>

      <nav className="sidebar__nav">
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
        <NavLink to="/profile" className="user-profile">
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
  );
}
