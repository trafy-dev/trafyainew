import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useLms } from './LmsContext';

/** Wraps every Classroom route: scopes the styles and gates by role. */
export default function LmsFrame({ need }) {
  const { ready, available, isStaff, isAdmin } = useLms();

  if (!ready) return <div className="loader" />;
  if (!available) {
    return (
      <div className="lms">
        <div className="card">
          <h3>Classroom is not set up yet</h3>
          <p className="muted">Run backend/db/lms-schema.sql in the Supabase SQL editor, then refresh.</p>
        </div>
      </div>
    );
  }
  if ((need === 'admin' && !isAdmin) || (need === 'staff' && !isStaff)) return <Navigate to="/" replace />;

  return (
    <div className="lms">
      <Outlet />
    </div>
  );
}
