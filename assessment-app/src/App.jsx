import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import MasterAssessment from './components/MasterAssessment';
import Leaderboard from './components/Leaderboard';
import Results from './components/Results';
import Login from './components/Login';
import ResetPassword from './components/ResetPassword';
import CompleteProfile from './components/CompleteProfile';

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
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/assessment" element={<MasterAssessment />} />
          <Route
            path="/leaderboard"
            element={isAdmin ? <Leaderboard /> : <Navigate to="/" replace />}
          />
          <Route path="/results" element={<Results />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {needsProfilePrompt && <CompleteProfile />}
    </div>
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
