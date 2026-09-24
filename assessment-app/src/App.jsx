import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import MasterAssessment from './components/MasterAssessment';
import AssessmentHub from './components/AssessmentHub';
import Leaderboard from './components/Leaderboard';
import Results from './components/Results';
import Login from './components/Login';
import ResetPassword from './components/ResetPassword';
import CompleteProfile from './components/CompleteProfile';
import Profile from './components/Profile';
import './lms/lms.css';
import { LmsProvider } from './lms/LmsContext';
import LmsFrame from './lms/LmsFrame';
import Chat from './lms/pages/Chat';
import Resources from './lms/pages/Resources';
import Calendar from './lms/pages/Calendar';
import Assignments from './lms/pages/Assignments';
import AssignmentDetail from './lms/pages/AssignmentDetail';
import Grades from './lms/pages/Grades';
import Courses from './lms/pages/Courses';
import Users from './lms/pages/Users';

function Shell() {
  const { user, loading, passwordRecovery, profile, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="auth-screen">
        <div className="loader" />
      </div>
    );
  }

  // Checked before the normal logged-in state: a recovery-link click signs
  // the user in, but they must set a new password before using the app.
  if (passwordRecovery) return <ResetPassword />;

  if (!user) return <Login />;

  // Prompt once per session for country/university if not set yet — but
  // only after the profile has actually loaded, so it doesn't flash before
  // we know whether it's needed.
  const needsProfilePrompt = profile && !profile.country && !profile.university;

  return (
    <LmsProvider>
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/assessment" element={<AssessmentHub />} />
          <Route path="/assessment/:slug" element={<MasterAssessment />} />
          <Route
            path="/leaderboard"
            element={isAdmin ? <Leaderboard /> : <Navigate to="/" replace />}
          />
          <Route path="/results" element={<Results />} />
          <Route path="/profile" element={<Profile />} />

          {/* Classroom (LMS) lives in the same dashboard, gated by role. */}
          <Route element={<LmsFrame />}>
            <Route path="/chat" element={<Chat />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/assignments" element={<Assignments />} />
            <Route path="/assignments/:id" element={<AssignmentDetail />} />
            <Route path="/grades" element={<Grades />} />
          </Route>
          <Route element={<LmsFrame need="staff" />}>
            <Route path="/courses" element={<Courses />} />
          </Route>
          <Route element={<LmsFrame need="admin" />}>
            <Route path="/users" element={<Users />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {needsProfilePrompt && <CompleteProfile />}
    </div>
    </LmsProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Shell />
      </Router>
    </AuthProvider>
  );
}
